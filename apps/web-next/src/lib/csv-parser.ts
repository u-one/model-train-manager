export interface ParsedCSVResult<T> {
  data: T[]
  errors: string[]
  skippedRows: number[]
}

export interface ProductCSVRow {
  brand: string
  productCode: string | null
  parentCode: string | null  // 追加: 親品番（セット単品用）
  name: string
  type: string // '単品' | 'セット' | 'セット単品'
  releaseYear: number | null
  priceExcludingTax: number | null
  priceIncludingTax: number | null
  description: string | null
  imageUrl: string | null
  vehicleType: string | null
  company: string | null
  manufacturingYear: string | null
  operationLine: string | null
  notes: string | null
}

export interface OwnedVehicleCSVRow {
  managementId: string
  productBrand: string | null // 新しく追加：メーカー
  productCode: string | null
  productName: string | null
  independentName: string | null
  independentBrand: string | null
  independentVehicleType: string | null
  currentStatus: string // '正常' | '要修理' | '故障中'
  storageCondition: string // 'ケースあり' | 'ケースなし'
  purchaseDate: string | null
  purchasePriceIncludingTax: number | null
  notes: string | null
}

// HTMLエスケープされた改行を実際の改行に変換
function convertHtmlBreaks(text: string | null): string | null {
  if (!text) return null
  return text.replace(/<BR\s*\/?>/gi, '\n')
}

export function parseCSV(csvContent: string): string[][] {
  const lines = csvContent.split('\n').filter(line => line.trim())
  const rows: string[][] = []

  for (const line of lines) {
    const row: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    row.push(current.trim())
    rows.push(row)
  }

  return rows
}

export function parseProductCSV(csvContent: string): ParsedCSVResult<ProductCSVRow> {
  const rows = parseCSV(csvContent)
  const data: ProductCSVRow[] = []
  const errors: string[] = []
  const skippedRows: number[] = []

  if (rows.length === 0) {
    errors.push('CSVファイルが空です')
    return { data, errors, skippedRows }
  }

  // 最初の行は行番号なのでスキップ
  const headerRowIndex = 1
  if (rows.length < 2) {
    errors.push('ヘッダー行が見つかりません')
    return { data, errors, skippedRows }
  }

  const header = rows[headerRowIndex]
  console.log('CSV header:', header)

  // 実際のCSVファイル形式に合わせて列インデックスを定義
  // ブランド,品番,parentCode,種別,商品名,税抜,税込,発売日,URL,詳細,タグ,JAN,JAN,icon,製造番号など,製造番号など,車両数
  const brandIndex = 0      // ブランド
  const codeIndex = 1       // 品番
  const parentCodeIndex = 2 // 親品番 (追加)
  const typeIndex = 3       // 種別
  const nameIndex = 4       // 商品名
  const priceExclIndex = 5  // 税抜
  const priceInclIndex = 6  // 税込
  const releaseDateIndex = 7 // 発売日
  const urlIndex = 8        // URL
  const descIndex = 9       // 詳細
  const tagIndex = 10       // タグ
  // const iconIndex = 13      // icon (未使用)

  // 最低限必要な列があるかチェック（ブランド、商品名）
  const minRequiredColumns = Math.max(brandIndex, nameIndex) + 1
  if (header.length < minRequiredColumns) {
    errors.push(`最低限必要な列数が不足しています。期待値: ${minRequiredColumns}列以上, 実際: ${header.length}列`)
    return { data, errors, skippedRows }
  }

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]

    // 空行をスキップ
    if (row.length === 0 || row.every(cell => !cell?.trim())) {
      continue
    }

    // 最低限必要な列（ブランド、商品名）があるかチェック
    if (row.length < Math.max(brandIndex, nameIndex) + 1) {
      skippedRows.push(rowIndex + 1)
      errors.push(`行 ${rowIndex + 1}: 必要な列数が不足しています`)
      continue
    }

    const brand = row[brandIndex]?.trim() || '<不明>'
    const name = row[nameIndex]?.trim() || '<不明>'
    const type = row[typeIndex]?.trim() || ''

    // ブランドが空の場合のみエラー（商品名は<不明>で補完）
    if (!row[brandIndex]?.trim()) {
      skippedRows.push(rowIndex + 1)
      errors.push(`行 ${rowIndex + 1}: ブランドが空です`)
      continue
    }

    // 種別はそのまま使用（データベースに日本語で保存）
    let convertedType = type || '単品'

    // 正規化して既知の値かチェック
    const normalizedType = type.replace(/\s+/g, '').toLowerCase()
    const validTypes = ['単品', 'セット', 'セット単品']

    if (!validTypes.includes(convertedType)) {
      if (normalizedType === 'set') {
        convertedType = 'セット'
      } else if (normalizedType === 'setsingle' || normalizedType === 'set単品') {
        convertedType = 'セット単品'
      } else if (normalizedType === 'single') {
        convertedType = '単品'
      } else if (type) {
        console.log(`行 ${rowIndex + 1}: 不明な種別 "${type}" → 単品 に変換`)
        convertedType = '単品'
      }
    }

    // 安全なフィールド取得関数
    const getField = (index: number) => row[index]?.trim() || null

    // 発売年の処理（発売日から年を抽出）
    let releaseYear: number | null = null
    const releaseDate = getField(releaseDateIndex)
    if (releaseDate) {
      const yearMatch = releaseDate.match(/(\d{4})/)
      if (yearMatch) {
        const year = parseInt(yearMatch[1])
        if (year >= 1900 && year <= 2030) {
          releaseYear = year
        }
      }
    }

    let priceExcludingTax = getField(priceExclIndex) ? parseFloat(getField(priceExclIndex)!) : null
    let priceIncludingTax = getField(priceInclIndex) ? parseFloat(getField(priceInclIndex)!) : null

    if (priceExcludingTax !== null && (isNaN(priceExcludingTax) || priceExcludingTax < 0)) {
      priceExcludingTax = null // エラーではなく null に設定
    }

    if (priceIncludingTax !== null && (isNaN(priceIncludingTax) || priceIncludingTax < 0)) {
      priceIncludingTax = null // エラーではなく null に設定
    }

    // 詳細フィールドとnotesフィールドのHTMLエスケープを変換
    const description = convertHtmlBreaks(getField(descIndex))
    const notes = convertHtmlBreaks(getField(tagIndex))

    data.push({
      brand,
      productCode: getField(codeIndex),
      parentCode: getField(parentCodeIndex), // 追加: 親品番
      name,
      type: convertedType,
      releaseYear,
      priceExcludingTax,
      priceIncludingTax,
      description,
      imageUrl: getField(urlIndex),
      vehicleType: null,  // 実車情報は別途処理が必要
      company: null,
      manufacturingYear: null,
      operationLine: null,
      notes,
    })
  }

  return { data, errors, skippedRows }
}

export function parseOwnedVehicleCSV(csvContent: string): ParsedCSVResult<OwnedVehicleCSVRow> {
  const rows = parseCSV(csvContent)
  const data: OwnedVehicleCSVRow[] = []
  const errors: string[] = []
  const skippedRows: number[] = []

  if (rows.length === 0) {
    errors.push('CSVファイルが空です')
    return { data, errors, skippedRows }
  }

  // 最初の行は行番号なのでスキップ
  const headerRowIndex = 1
  if (rows.length < 2) {
    errors.push('ヘッダー行が見つかりません')
    return { data, errors, skippedRows }
  }

  const header = rows[headerRowIndex]
  console.log('CSV header:', header)

  // 実際のCSVファイル形式に合わせて列インデックスを定義
  // No,分類,系統,,,セット/単品,形式,メーカー,品番,定価,購入価格(税抜),(税込),入手場所,購入日,ID,,備考１,ケース有無,備考２
  const noIndex = 0           // No
  const categoryIndex = 1     // 分類
  const systemIndex = 2       // 系統
  // const setTypeIndex = 5      // セット/単品 (未使用)
  const vehicleTypeIndex = 6  // 形式
  const brandIndex = 7        // メーカー
  const codeIndex = 8         // 品番
  // const listPriceIndex = 9    // 定価 (未使用)
  // const purchasePriceExclIndex = 10 // 購入価格(税抜) (未使用)
  const purchasePriceInclIndex = 11 // (税込)
  const storeIndex = 12       // 入手場所
  const dateIndex = 13        // 購入日
  const idIndex = 14          // ID
  const notes1Index = 16      // 備考１
  const caseIndex = 17        // ケース有無
  const notes2Index = 18      // 備考２

  // 最低限必要な列があるかチェック（NoまたはID）
  const minRequiredColumnsForOwnedVehicle = Math.max(noIndex, idIndex) + 1
  if (header.length < minRequiredColumnsForOwnedVehicle) {
    errors.push(`最低限必要な列数が不足しています。期待値: ${minRequiredColumnsForOwnedVehicle}列以上, 実際: ${header.length}列`)
    return { data, errors, skippedRows }
  }

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]

    // 空行をスキップ
    if (row.length === 0 || row.every(cell => !cell?.trim())) {
      continue
    }

    // 最低限必要な列（NoまたはID）があるかチェック
    const minRequiredColumns = Math.max(noIndex, idIndex) + 1
    if (row.length < minRequiredColumns) {
      skippedRows.push(rowIndex + 1)
      errors.push(`行 ${rowIndex + 1}: 必要な列数が不足しています`)
      continue
    }

    // 安全なフィールド取得関数
    const getField = (index: number) => row[index]?.trim() || null

    // IDフィールドを管理IDとして使用（空の場合はそのまま空）
    const managementId = getField(idIndex) || ''

    // ステータスは正常に設定（CSVには含まれていない）
    const currentStatus = '正常'

    // ケース有無の変換
    const caseInfo = getField(caseIndex)
    let storageCondition = 'ケースあり'
    if (caseInfo === 'ケースなし' || caseInfo === 'なし') {
      storageCondition = 'ケースなし'
    }

    const purchasePriceStr = getField(purchasePriceInclIndex)
    const purchasePrice = purchasePriceStr ? parseFloat(purchasePriceStr) : null

    let purchaseDate: string | null = null
    const dateStr = getField(dateIndex)
    if (dateStr) {
      try {
        // 日本の日付形式 YYYY/MM/DD を処理
        const dateParts = dateStr.split('/')
        if (dateParts.length === 3) {
          const year = parseInt(dateParts[0])
          const month = parseInt(dateParts[1])
          const day = parseInt(dateParts[2])
          const date = new Date(year, month - 1, day)
          if (!isNaN(date.getTime())) {
            purchaseDate = date.toISOString().split('T')[0]
          }
        }
      } catch {
        // 日付解析エラーは無視
      }
    }

    // 商品情報の組み立て
    const productCode = getField(codeIndex)
    const category = getField(categoryIndex) || ''
    const system = getField(systemIndex) || ''
    const productName = `${category} ${system}`.trim() || '<不明>'
    const independentName = productName
    const independentBrand = getField(brandIndex) || '<不明>'
    const independentVehicleType = getField(vehicleTypeIndex)

    // notesフィールドのHTMLエスケープを変換
    const rawNotes = [
      getField(notes1Index),
      getField(notes2Index),
      getField(storeIndex) ? `入手場所: ${getField(storeIndex)}` : null
    ].filter(Boolean).join(', ') || null

    const notes = convertHtmlBreaks(rawNotes)

    data.push({
      managementId,
      productBrand: getField(brandIndex), // メーカー情報を追加
      productCode,
      productName,
      independentName,
      independentBrand,
      independentVehicleType,
      currentStatus,
      storageCondition,
      purchaseDate,
      purchasePriceIncludingTax: purchasePrice,
      notes,
    })
  }

  return { data, errors, skippedRows }
}