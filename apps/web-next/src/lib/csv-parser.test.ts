import { StorageCondition, VehicleStatus } from '@prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { parseCSV, parseOwnedVehicleCSV, parseProductCSV } from './csv-parser'

const ownedVehicleHeader = [
  'No',
  '分類',
  '系統',
  '',
  '',
  'セット/単品',
  '形式',
  'メーカー',
  '品番',
  '定価',
  '購入価格(税抜)',
  '(税込)',
  '入手場所',
  '購入日',
  'ID',
  '',
  '備考１',
  'ケース有無',
  '備考２',
]

const ownedVehicleRow = [
  '1',
  '電車',
  'E233系',
  '',
  '',
  '',
  'E233',
  'KATO',
  '10-001',
  '',
  '',
  '19800',
  '模型店',
  '2024/05/06',
  'M-001',
  '',
  '備考<BR>1',
  'ケースなし',
  '備考2',
]

describe('parseCSV', () => {
  it('クォート付きの値、エスケープされたクォート、未クォートセルのトリムを処理する', () => {
    const csv = [
      'brand,code,name',
      '"KATO, Inc.","10-001","Series ""A"""',
      ' TOMIX , 98765 , E233系 ',
    ].join('\n')

    expect(parseCSV(csv)).toEqual([
      ['brand', 'code', 'name'],
      ['KATO, Inc.', '10-001', 'Series "A"'],
      ['TOMIX', '98765', 'E233系'],
    ])
  })

  it('空行を無視する', () => {
    expect(parseCSV('\nbrand,code\n\nKATO,10-001\n')).toEqual([
      ['brand', 'code'],
      ['KATO', '10-001'],
    ])
  })
})

describe('parseProductCSV', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('商品行をインポートCSV形式に従って変換する', () => {
    const csv = [
      '1,2,3,4,5,6,7,8,9,10,11',
      'ブランド,品番,親品番,種別,商品名,税抜,税込,発売日,URL,詳細,タグ',
      'KATO,10-001,10-000,set,E233系 中央線,12000,13200,2024/05,https://example.com/item,説明<BR>続き,通勤型<BR/>中央線',
    ].join('\n')

    const result = parseProductCSV(csv)

    expect(result.errors).toEqual([])
    expect(result.skippedRows).toEqual([])
    expect(result.data).toEqual([
      {
        brand: 'KATO',
        productCode: '10-001',
        parentCode: '10-000',
        name: 'E233系 中央線',
        type: 'セット',
        releaseYear: 2024,
        priceExcludingTax: 12000,
        priceIncludingTax: 13200,
        description: '説明\n続き',
        imageUrl: 'https://example.com/item',
        vehicleType: null,
        company: null,
        manufacturingYear: null,
        operationLine: null,
        notes: '通勤型\n中央線',
      },
    ])
  })

  it('空のCSVとヘッダー行不足を報告する', () => {
    expect(parseProductCSV('')).toEqual({
      data: [],
      errors: ['CSVファイルが空です'],
      skippedRows: [],
    })

    expect(parseProductCSV('1,2,3')).toEqual({
      data: [],
      errors: ['ヘッダー行が見つかりません'],
      skippedRows: [],
    })
  })

  it('ブランドが空の行をスキップし、不正な任意項目をnullに正規化する', () => {
    const csv = [
      '1,2,3,4,5,6,7,8,9,10,11',
      'ブランド,品番,親品番,種別,商品名,税抜,税込,発売日,URL,詳細,タグ',
      ',10-001,,単品,ブランドなし,1000,1100,2024/01,,,',
      'TOMIX,98765,,unknown,,invalid,-1,1899/01,,,',
    ].join('\n')

    const result = parseProductCSV(csv)

    expect(result.errors).toEqual(['行 3: ブランドが空です'])
    expect(result.skippedRows).toEqual([3])
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toMatchObject({
      brand: 'TOMIX',
      name: '<不明>',
      type: '単品',
      releaseYear: null,
      priceExcludingTax: null,
      priceIncludingTax: null,
    })
  })
})

describe('parseOwnedVehicleCSV', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('所有車両行をインポートCSV形式に従って変換する', () => {
    const result = parseOwnedVehicleCSV([
      ownedVehicleHeader.join(','),
      ownedVehicleRow.join(','),
    ].join('\n'))

    expect(result.errors).toEqual([])
    expect(result.skippedRows).toEqual([])
    expect(result.data).toEqual([
      {
        managementId: 'M-001',
        productBrand: 'KATO',
        productCode: '10-001',
        productName: '電車 E233系',
        independentName: '電車 E233系',
        independentBrand: 'KATO',
        independentVehicleType: 'E233',
        currentStatus: VehicleStatus.NORMAL,
        storageCondition: StorageCondition.WITHOUT_CASE,
        purchaseDate: new Date(2024, 4, 6).toISOString(),
        purchasePriceIncludingTax: 19800,
        notes: '備考\n1, 備考2, 入手場所: 模型店',
      },
    ])
  })

  it('必須列不足を報告し、列数が足りないデータ行をスキップする', () => {
    expect(parseOwnedVehicleCSV('No,分類')).toEqual({
      data: [],
      errors: ['ヘッダー行が見つかりません'],
      skippedRows: [],
    })

    const csv = [
      'No,分類,系統,,,,形式,メーカー,品番,,,税込,入手場所,購入日,ID',
      '1,電車',
    ].join('\n')

    expect(parseOwnedVehicleCSV(csv)).toEqual({
      data: [],
      errors: ['行 2: 必要な列数が不足しています'],
      skippedRows: [2],
    })
  })
})
