'use client'

import { useRouter } from 'next/navigation'
import CSVImport from '@/components/CSVImport'
import AuthGuard from '@/components/AuthGuard'

export default function ImportPage() {
  const router = useRouter()

  const handleProductImportSuccess = () => {
    router.refresh()
  }

  const handleOwnedVehicleImportSuccess = () => {
    router.refresh()
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← 戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">CSVインポート</h1>
        </div>

        <div className="space-y-8">
          <CSVImport
            title="製品情報インポート"
            endpoint="/api/products/import"
            onSuccess={handleProductImportSuccess}
          />

          <CSVImport
            title="保有車両インポート"
            endpoint="/api/owned-vehicles/import"
            onSuccess={handleOwnedVehicleImportSuccess}
            enableChunkedUpload={true}
            chunkSize={50}
          />
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">CSVフォーマット仕様</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-blue-800">製品情報CSV</h3>
              <p className="text-sm text-blue-700 mt-1">
                列順: 行番号, ブランド, 品番, parentCode, 種別, 商品名, 税抜, 税込, 発売日, URL, 詳細, タグ, JAN, JAN, icon, 製造番号など, 製造番号など, 車両数
              </p>
              <p className="text-xs text-blue-600 mt-1">
                ※ 種別は「単品」「セット」「セット単品」のいずれか<br />
                ※ 1行目は行番号、2行目はヘッダー、3行目以降がデータ
              </p>
            </div>

            <div>
              <h3 className="font-medium text-blue-800">保有車両CSV</h3>
              <p className="text-sm text-blue-700 mt-1">
                列順: 行番号, No, 分類, 系統, , , セット/単品, 形式, メーカー, 品番, 定価, 購入価格(税抜), (税込), 入手場所, 購入日, ID, , 備考１, ケース有無, 備考２
              </p>
              <p className="text-xs text-blue-600 mt-1">
                ※ 管理IDはIDまたはNoを使用<br />
                ※ ケース有無: 「ケースなし」以外は「ケースあり」として扱う<br />
                ※ 購入日: YYYY/MM/DD形式<br />
                ※ 1行目は行番号、2行目はヘッダー、3行目以降がデータ<br />
                ※ 大量データ（50行以上）の場合、自動的にチャンク分割アップロードされます
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}