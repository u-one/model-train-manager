import { PrismaClient } from '@prisma/client'

const apply = process.argv.includes('--apply')
const prisma = new PrismaClient()

try {
  const [components, existingMemberships, allSets, setOwners, existingChildren] = await Promise.all([
    prisma.product.findMany({
      where: { type: 'SET_SINGLE', parentCode: { not: null } },
      select: { id: true, brand: true, parentCode: true }
    }),
    prisma.productSetComponent.findMany({ select: { setProductId: true, componentProductId: true } }),
    prisma.product.findMany({
      where: { type: 'SET', productCode: { not: null } },
      select: { id: true, brand: true, productCode: true }
    }),
    prisma.ownedVehicle.findMany({
      where: { product: { is: { type: 'SET' } } },
      include: { product: { select: { brand: true, productCode: true, name: true } } }
    }),
    prisma.ownedVehicle.findMany({
      where: { product: { is: { type: 'SET_SINGLE' } } },
      include: { product: { select: { brand: true, parentCode: true } } }
    }),
  ])

  const membershipKeys = new Set(existingMemberships.map(item => `${item.setProductId}:${item.componentProductId}`))
  const productCandidates = []
  const productUnresolved = []
  let productNoMatch = 0
  let productAmbiguous = 0
  let productAlreadyLinked = 0
  const setsByCode = new Map()
  for (const set of allSets) {
    const key = `${set.brand.toLocaleLowerCase()}:${set.productCode.toLocaleLowerCase()}`
    setsByCode.set(key, [...(setsByCode.get(key) ?? []), set])
  }
  for (const component of components) {
    const parents = setsByCode.get(`${component.brand.toLocaleLowerCase()}:${component.parentCode?.toLocaleLowerCase()}`) ?? []
    if (parents.length === 0) {
      productNoMatch++
      productUnresolved.push({ componentProductId: component.id, parentCode: component.parentCode, reason: 'no_matching_set' })
    } else if (parents.length > 1) {
      productAmbiguous++
      productUnresolved.push({ componentProductId: component.id, parentCode: component.parentCode, reason: 'multiple_matching_sets', candidateSetProductIds: parents.map(parent => parent.id) })
    }
    else {
      const key = `${parents[0].id}:${component.id}`
      if (membershipKeys.has(key)) productAlreadyLinked++
      else productCandidates.push({ setProductId: parents[0].id, componentProductId: component.id })
    }
  }

  const ownedCandidates = []
  const ownedUnresolved = []
  let ownedNoMatch = 0
  let ownedAmbiguous = 0
  let ownedAlreadyLinked = 0
  for (const child of existingChildren) {
    const childParentCode = child.product?.parentCode?.toLocaleLowerCase()
    if (!childParentCode || !child.notes) {
      ownedNoMatch++
      ownedUnresolved.push({ ownedVehicleId: child.id, userId: child.userId, productId: child.productId, reason: 'missing_parent_code_or_legacy_marker' })
      continue
    }
    const matchingParents = setOwners.filter(parent => {
      const parentCode = parent.product?.productCode?.toLocaleLowerCase()
      const parentBrand = parent.product?.brand?.toLocaleLowerCase()
      const childBrand = child.product?.brand?.toLocaleLowerCase()
      if (parent.userId !== child.userId || parentCode !== childParentCode || parentBrand !== childBrand) return false
      const marker = `セット「${parent.product?.name ?? ''}」(管理ID: ${parent.managementId})`
      return child.notes.includes(marker)
    })
    if (matchingParents.length === 0) {
      ownedNoMatch++
      ownedUnresolved.push({ ownedVehicleId: child.id, userId: child.userId, productId: child.productId, parentCode: child.product?.parentCode, reason: 'no_matching_owned_set' })
    } else if (matchingParents.length > 1) {
      ownedAmbiguous++
      ownedUnresolved.push({ ownedVehicleId: child.id, userId: child.userId, productId: child.productId, parentCode: child.product?.parentCode, reason: 'multiple_matching_owned_sets', candidateParentOwnedVehicleIds: matchingParents.map(parent => parent.id) })
    }
    else {
      const parent = matchingParents[0]
      if (child.parentSetOwnedVehicleId === parent.id) ownedAlreadyLinked++
      else if (child.parentSetOwnedVehicleId !== null) {
        ownedAmbiguous++
        ownedUnresolved.push({ ownedVehicleId: child.id, userId: child.userId, productId: child.productId, reason: 'already_linked_to_different_parent', existingParentOwnedVehicleId: child.parentSetOwnedVehicleId, candidateParentOwnedVehicleId: parent.id })
      }
      else ownedCandidates.push({ childId: child.id, parentId: parent.id })
    }
  }

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    productMemberships: {
      candidates: productCandidates.length,
      alreadyLinked: productAlreadyLinked,
      unresolvedNoMatch: productNoMatch,
      unresolvedAmbiguous: productAmbiguous
    },
    ownedRelationships: {
      candidates: ownedCandidates.length,
      alreadyLinked: ownedAlreadyLinked,
      unresolvedNoMatch: ownedNoMatch,
      unresolvedAmbiguous: ownedAmbiguous,
      unresolved: ownedUnresolved
    },
    productUnresolved
  }, null, 2))

  if (apply) {
    await prisma.$transaction(async tx => {
      for (const membership of productCandidates) {
        await tx.productSetComponent.createMany({ data: [membership], skipDuplicates: true })
      }
      for (const relation of ownedCandidates) {
        await tx.ownedVehicle.updateMany({
          where: { id: relation.childId, parentSetOwnedVehicleId: null },
          data: { parentSetOwnedVehicleId: relation.parentId }
        })
      }
    }, { timeout: 60000, maxWait: 10000 })
    console.log(`Applied ${productCandidates.length} product memberships and ${ownedCandidates.length} owned relationships.`)
  }
} finally {
  await prisma.$disconnect()
}
