/**
 * API リクエストの日付フィールドを処理する
 * @param dateValue - 処理する日付値
 * @returns 変換された Date オブジェクトまたは undefined
 */
export function processDateField(dateValue: unknown): Date | undefined {
  if (dateValue === undefined || dateValue === '' || dateValue === null) {
    return undefined
  }
  
  if (typeof dateValue === 'string') {
    // 日付文字列の形式を確認 (YYYY-MM-DD形式)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(dateValue)) {
      throw new Error(`Invalid date format (expected YYYY-MM-DD): ${dateValue}`)
    }
    
    // ISO日付文字列として処理（時刻部分を00:00:00に設定）
    const isoDateString = `${dateValue}T00:00:00.000Z`
    const date = new Date(isoDateString)
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date string: ${dateValue}`)
    }
    return date
  }
  
  if (dateValue instanceof Date) {
    return dateValue
  }
  
  throw new Error(`Unsupported date value type: ${typeof dateValue}`)
}

/**
 * リクエストデータの日付フィールドを一括処理する
 * @param data - 処理するデータオブジェクト
 * @param dateFields - 処理する日付フィールド名の配列
 */
export function processDateFields(data: Record<string, unknown>, dateFields: string[]): void {
  for (const field of dateFields) {
    if (field in data) {
      try {
        data[field] = processDateField(data[field])
      } catch (error) {
        throw new Error(`Error processing ${field}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }
}
