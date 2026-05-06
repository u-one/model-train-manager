import { z } from 'zod'
import { Session } from 'next-auth'

export function getCurrentUserId(session: Session | null): number | null {
  if (!session?.user?.id) return null
  const id = parseInt(session.user.id)
  return isNaN(id) ? null : id
}

export const createProductSchema = z.object({
  brand: z.string().min(1),
  type: z.enum(['SINGLE', 'SET', 'SET_SINGLE']),
  name: z.string().min(1),
  productCode: z.string().optional().nullable(),
  parentCode: z.string().optional().nullable(),
  releaseYear: z.number().int().optional().nullable(),
  priceExcludingTax: z.number().int().optional().nullable(),
  priceIncludingTax: z.number().int().optional().nullable(),
  janCode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  vehicleCount: z.number().int().min(1).default(1),
  url: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  imageUrls: z.array(z.string()).default([]),
  realVehicles: z.array(z.object({
    vehicleType: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    manufacturingYear: z.string().optional().nullable(),
    operationLine: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })).optional(),
})
