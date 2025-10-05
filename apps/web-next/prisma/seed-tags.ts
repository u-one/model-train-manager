import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// タグカテゴリ定義
const TAG_CATEGORIES = {
  VEHICLE_TYPE: 'vehicle_type',
  COMPANY: 'company',
  FEATURE: 'feature',
  ERA: 'era'
} as const

// 基本タグデータ
const TAGS_DATA = [
  // 車種タグ
  { name: '新幹線', category: TAG_CATEGORIES.VEHICLE_TYPE, description: '新幹線車両' },
  { name: '在来線', category: TAG_CATEGORIES.VEHICLE_TYPE, description: '在来線の車両' },
  { name: '気動車', category: TAG_CATEGORIES.VEHICLE_TYPE, description: 'ディーゼル車両' },
  { name: '客車', category: TAG_CATEGORIES.VEHICLE_TYPE, description: '客車' },
  { name: '旧客車', category: TAG_CATEGORIES.VEHICLE_TYPE, description: '旧客車' },
  { name: '貨車', category: TAG_CATEGORIES.VEHICLE_TYPE, description: '貨物車' },
  { name: '機関車', category: TAG_CATEGORIES.VEHICLE_TYPE, description: '機関車' },
  { name: '私鉄', category: TAG_CATEGORIES.VEHICLE_TYPE, description: '私鉄の車両' },
  { name: '路面電車', category: TAG_CATEGORIES.VEHICLE_TYPE, description: '路面電車' },

  // 運営会社タグ（JR各社）
  { name: 'JR北海道', category: TAG_CATEGORIES.COMPANY, description: '北海道旅客鉄道' },
  { name: 'JR東日本', category: TAG_CATEGORIES.COMPANY, description: '東日本旅客鉄道' },
  { name: 'JR東海', category: TAG_CATEGORIES.COMPANY, description: '東海旅客鉄道' },
  { name: 'JR西日本', category: TAG_CATEGORIES.COMPANY, description: '西日本旅客鉄道' },
  { name: 'JR四国', category: TAG_CATEGORIES.COMPANY, description: '四国旅客鉄道' },
  { name: 'JR九州', category: TAG_CATEGORIES.COMPANY, description: '九州旅客鉄道' },
  { name: '国鉄', category: TAG_CATEGORIES.COMPANY, description: '日本国有鉄道' },

  // 運営会社タグ（大手私鉄）
  { name: '東京メトロ', category: TAG_CATEGORIES.COMPANY, description: '東京地下鉄' },
  { name: '都営地下鉄', category: TAG_CATEGORIES.COMPANY, description: '東京都交通局' },
  { name: '小田急電鉄', category: TAG_CATEGORIES.COMPANY, description: '小田急電鉄' },
  { name: '京急電鉄', category: TAG_CATEGORIES.COMPANY, description: '京浜急行電鉄' },
  { name: '東急電鉄', category: TAG_CATEGORIES.COMPANY, description: '東京急行電鉄' },
  { name: '京王電鉄', category: TAG_CATEGORIES.COMPANY, description: '京王電鉄' },
  { name: '西武鉄道', category: TAG_CATEGORIES.COMPANY, description: '西武鉄道' },
  { name: '東武鉄道', category: TAG_CATEGORIES.COMPANY, description: '東武鉄道' },
  { name: '京成電鉄', category: TAG_CATEGORIES.COMPANY, description: '京成電鉄' },
  { name: '相鉄', category: TAG_CATEGORIES.COMPANY, description: '相模鉄道' },
  { name: '近畿日本鉄道', category: TAG_CATEGORIES.COMPANY, description: '近畿日本鉄道（近鉄）' },
  { name: '阪急電鉄', category: TAG_CATEGORIES.COMPANY, description: '阪急電鉄' },
  { name: '阪神電気鉄道', category: TAG_CATEGORIES.COMPANY, description: '阪神電気鉄道' },
  { name: '南海電気鉄道', category: TAG_CATEGORIES.COMPANY, description: '南海電気鉄道' },
  { name: '京阪電気鉄道', category: TAG_CATEGORIES.COMPANY, description: '京阪電気鉄道' },
  { name: '名古屋鉄道', category: TAG_CATEGORIES.COMPANY, description: '名古屋鉄道（名鉄）' },
  { name: '西日本鉄道', category: TAG_CATEGORIES.COMPANY, description: '西日本鉄道（西鉄）' },

  // 特徴タグ（編成・両数）
  { name: '1両編成', category: TAG_CATEGORIES.FEATURE, description: '1両編成' },
  { name: '2両編成', category: TAG_CATEGORIES.FEATURE, description: '2両編成' },
  { name: '3両編成', category: TAG_CATEGORIES.FEATURE, description: '3両編成' },
  { name: '4両編成', category: TAG_CATEGORIES.FEATURE, description: '4両編成' },
  { name: '6両編成', category: TAG_CATEGORIES.FEATURE, description: '6両編成' },
  { name: '8両編成', category: TAG_CATEGORIES.FEATURE, description: '8両編成' },
  { name: '10両編成', category: TAG_CATEGORIES.FEATURE, description: '10両編成' },
  { name: '12両編成', category: TAG_CATEGORIES.FEATURE, description: '12両編成' },
  { name: '16両編成', category: TAG_CATEGORIES.FEATURE, description: '16両編成' },

  // 特徴タグ（用途分類）
  { name: '通勤形', category: TAG_CATEGORIES.FEATURE, description: '通勤型車両' },
  { name: '近郊形', category: TAG_CATEGORIES.FEATURE, description: '近郊型車両' },
  { name: '特急形', category: TAG_CATEGORIES.FEATURE, description: '特急型車両' },
  { name: '急行形', category: TAG_CATEGORIES.FEATURE, description: '急行型車両' },
  { name: '寝台車', category: TAG_CATEGORIES.FEATURE, description: '寝台車' },
  { name: '食堂車', category: TAG_CATEGORIES.FEATURE, description: '食堂車' },
  { name: 'グリーン車', category: TAG_CATEGORIES.FEATURE, description: 'グリーン車' },

  // 特徴タグ（技術仕様）
  { name: '室内灯対応', category: TAG_CATEGORIES.FEATURE, description: '室内灯装着可能' },
  { name: 'モーター車', category: TAG_CATEGORIES.FEATURE, description: 'モーター付きの車両' },
  { name: 'フライホイール', category: TAG_CATEGORIES.FEATURE, description: 'フライホイール搭載' },
  { name: 'ヘッドライト点灯', category: TAG_CATEGORIES.FEATURE, description: 'ヘッドライト点灯機能' },
  { name: 'テールライト点灯', category: TAG_CATEGORIES.FEATURE, description: 'テールライト点灯機能' },
  { name: 'DCC対応', category: TAG_CATEGORIES.FEATURE, description: 'DCC対応' },

  // 特徴タグ（商品特性）
  { name: '限定品', category: TAG_CATEGORIES.FEATURE, description: '限定販売品' },
  { name: '絶版', category: TAG_CATEGORIES.FEATURE, description: '絶版商品' },
  { name: '復刻版', category: TAG_CATEGORIES.FEATURE, description: '復刻版' },
  { name: 'リニューアル品', category: TAG_CATEGORIES.FEATURE, description: 'リニューアル商品' },

  // 時代・塗装タグ
  { name: '国鉄時代', category: TAG_CATEGORIES.ERA, description: '国鉄時代の車両' },
  { name: 'JR発足時', category: TAG_CATEGORIES.ERA, description: 'JR発足時の車両' },
  { name: '現在', category: TAG_CATEGORIES.ERA, description: '現在運行中の車両' },
  { name: '引退済み', category: TAG_CATEGORIES.ERA, description: '引退した車両' },
  { name: '国鉄色', category: TAG_CATEGORIES.ERA, description: '国鉄時代の塗装' },
  { name: 'JR色', category: TAG_CATEGORIES.ERA, description: 'JR発足後の塗装' },
  { name: '特別塗装', category: TAG_CATEGORIES.ERA, description: '特別塗装車両' },
  { name: 'ラッピング車両', category: TAG_CATEGORIES.ERA, description: 'ラッピング広告車両' },
  { name: '記念塗装', category: TAG_CATEGORIES.ERA, description: '記念塗装車両' }
]

async function main() {
  console.log('🌱 タグデータの投入を開始します...\n')

  try {
    // 既存のタグ数を確認
    const existingCount = await prisma.tag.count()
    console.log(`既存のタグ数: ${existingCount}`)

    if (existingCount > 0) {
      console.log('⚠️  既にタグが登録されています。')
      console.log('既存のタグを削除する場合は、手動で削除してください。')
      console.log('スクリプトを終了します。\n')
      return
    }

    // タグを一括登録
    console.log(`${TAGS_DATA.length}個のタグを登録中...`)

    const result = await prisma.tag.createMany({
      data: TAGS_DATA,
      skipDuplicates: true
    })

    console.log(`✅ ${result.count}個のタグを登録しました。\n`)

    // カテゴリ別の集計
    const categoryCounts = await prisma.tag.groupBy({
      by: ['category'],
      _count: {
        category: true
      }
    })

    console.log('📊 カテゴリ別タグ数:')
    categoryCounts.forEach(({ category, _count }) => {
      const categoryLabel = {
        [TAG_CATEGORIES.VEHICLE_TYPE]: '車種',
        [TAG_CATEGORIES.COMPANY]: '運営会社',
        [TAG_CATEGORIES.FEATURE]: '特徴',
        [TAG_CATEGORIES.ERA]: '時代・塗装'
      }[category] || category

      console.log(`   ${categoryLabel}: ${_count.category}個`)
    })

    console.log('\n✨ タグデータの投入が完了しました！')
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    throw error
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
