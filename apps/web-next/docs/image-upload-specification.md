# Phase 3.2: 画像アップロード機能 設計仕様書

## 1. 概要

### 1.1 目的
保有車両および製品マスタに画像をアップロード・管理する機能を実装する。

### 1.2 設計方針
- **ストレージ抽象化**: 将来的なストレージサービス変更を容易にする
- **初期実装**: Vercel Blob Storage
- **将来対応**: AWS S3, Supabase Storage等への切り替えが可能

### 1.3 対象エンティティ
- **保有車両**: 複数画像（配列）
- **製品マスタ**: 複数画像（配列）

---

## 2. アーキテクチャ設計

### 2.1 レイヤー構造
```
┌─────────────────────────────────────┐
│  UI層 (React Components)            │
│  - ImageUploader.tsx                │
│  - ImageGallery.tsx                 │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  API層 (Next.js API Routes)         │
│  - POST /api/images/upload          │
│  - DELETE /api/images/[key]         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Storage抽象化層                     │
│  - lib/storage/interface.ts         │
│  - lib/storage/index.ts (Factory)   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  具体実装層                          │
│  - lib/storage/vercel-blob.ts       │
│  - lib/storage/aws-s3.ts (将来)     │
│  - lib/storage/supabase.ts (将来)   │
└─────────────────────────────────────┘
```

### 2.2 ストレージインターフェース
```typescript
// lib/storage/interface.ts
export interface StorageProvider {
  /**
   * 画像をアップロード
   * @param file アップロードするファイル
   * @param options アップロードオプション
   * @returns アップロード結果（URL、キー等）
   */
  upload(file: File | Buffer, options: UploadOptions): Promise<UploadResult>

  /**
   * 画像を削除
   * @param key 削除する画像のキーまたはURL
   */
  delete(key: string): Promise<void>

  /**
   * 画像リストを取得
   * @param prefix フィルタ用のプレフィックス
   */
  list(prefix?: string): Promise<StorageItem[]>

  /**
   * 画像のメタデータを取得
   * @param key 画像のキーまたはURL
   */
  getMetadata(key: string): Promise<StorageMetadata>
}

export interface UploadOptions {
  /** パス（例: "owned-vehicles/123/image.jpg"） */
  pathname: string
  /** アクセス権限 */
  access?: 'public' | 'private'
  /** Content-Type */
  contentType?: string
  /** キャッシュ制御 */
  cacheControl?: string
  /** ランダムサフィックスを追加 */
  addRandomSuffix?: boolean
}

export interface UploadResult {
  /** アクセス用URL */
  url: string
  /** ストレージキー（削除用） */
  key: string
  /** ファイルサイズ（バイト） */
  size: number
  /** アップロード日時 */
  uploadedAt: Date
}

export interface StorageItem {
  url: string
  key: string
  size: number
  uploadedAt: Date
}

export interface StorageMetadata {
  contentType: string
  size: number
  uploadedAt: Date
  cacheControl?: string
}
```

### 2.3 ストレージファクトリー
```typescript
// lib/storage/index.ts
import { StorageProvider } from './interface'
import { VercelBlobStorage } from './vercel-blob'

export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || 'vercel-blob'

  switch (provider) {
    case 'vercel-blob':
      return new VercelBlobStorage()
    // 将来の拡張ポイント
    // case 'aws-s3':
    //   return new AWSS3Storage()
    // case 'supabase':
    //   return new SupabaseStorage()
    default:
      throw new Error(`Unknown storage provider: ${provider}`)
  }
}

// 便利な再エクスポート
export * from './interface'
export const storage = getStorageProvider()
```

---

## 3. 技術仕様

### 3.1 Vercel Blob Storage

#### 3.1.1 パッケージ
```bash
npm install @vercel/blob
```

#### 3.1.2 環境変数
```env
# Vercel Blob Storage（自動設定）
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxx"

# ストレージプロバイダー選択（オプション）
STORAGE_PROVIDER="vercel-blob"
```

#### 3.1.3 実装クラス
```typescript
// lib/storage/vercel-blob.ts
import { put, del, list, head } from '@vercel/blob'
import { StorageProvider, UploadOptions, UploadResult } from './interface'

export class VercelBlobStorage implements StorageProvider {
  async upload(file: File | Buffer, options: UploadOptions): Promise<UploadResult> {
    const blob = await put(options.pathname, file, {
      access: options.access || 'public',
      contentType: options.contentType,
      cacheControlMaxAge: options.cacheControl ? parseInt(options.cacheControl) : undefined,
      addRandomSuffix: options.addRandomSuffix ?? true,
    })

    return {
      url: blob.url,
      key: blob.pathname,
      size: blob.size,
      uploadedAt: new Date(blob.uploadedAt),
    }
  }

  async delete(key: string): Promise<void> {
    await del(key)
  }

  async list(prefix?: string): Promise<StorageItem[]> {
    const result = await list({ prefix })
    return result.blobs.map(blob => ({
      url: blob.url,
      key: blob.pathname,
      size: blob.size,
      uploadedAt: new Date(blob.uploadedAt),
    }))
  }

  async getMetadata(url: string): Promise<StorageMetadata> {
    const blob = await head(url)
    return {
      contentType: blob.contentType,
      size: blob.size,
      uploadedAt: new Date(blob.uploadedAt),
      cacheControl: blob.cacheControl,
    }
  }
}
```

### 3.2 画像制約

#### 3.2.1 ファイル形式
- **許可形式**: JPEG, PNG, WebP, GIF
- **MIMEタイプ**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`

#### 3.2.2 ファイルサイズ
- **最大サイズ**: 5MB/枚
- **推奨サイズ**: 1MB以下（フロントエンドでリサイズ推奨）

#### 3.2.3 ファイル名規則
```
{entity-type}/{entity-id}/{timestamp}-{original-filename}

例:
- owned-vehicles/123/1704067200000-front-view.jpg
- products/456/1704067200000-package.jpg
```

### 3.3 パス設計

#### 3.3.1 保有車両画像
```
owned-vehicles/{owned_vehicle_id}/{timestamp}-{filename}
```

#### 3.3.2 製品画像
```
products/{product_id}/{timestamp}-{filename}
```

---

## 4. API設計

### 4.1 画像アップロードAPI

#### 4.1.1 エンドポイント
```
POST /api/images/upload
```

#### 4.1.2 リクエスト
```typescript
// Content-Type: multipart/form-data
FormData {
  file: File
  entityType: 'owned-vehicle' | 'product'
  entityId: string
}
```

#### 4.1.3 レスポンス
```typescript
// 成功
{
  url: string
  key: string
  size: number
}

// エラー
{
  error: string
  details?: string
}
```

#### 4.1.4 バリデーション
- ファイル形式チェック
- ファイルサイズチェック（5MB以下）
- 認証チェック（ログイン必須）
- 権限チェック（自分の保有車両のみ、または製品作成者）

### 4.2 画像削除API

#### 4.2.1 エンドポイント
```
DELETE /api/images/[key]
```

#### 4.2.2 リクエスト
```
DELETE /api/images/owned-vehicles/123/1704067200000-front.jpg
```

#### 4.2.3 レスポンス
```typescript
// 成功
{
  message: "Image deleted successfully"
}

// エラー
{
  error: string
}
```

#### 4.2.4 権限チェック
- 保有車両の所有者のみ削除可能
- 製品作成者または管理者のみ削除可能

---

## 5. UIコンポーネント設計

### 5.1 ImageUploader コンポーネント

#### 5.1.1 機能
- ドラッグ&ドロップ対応
- ファイル選択ボタン
- 複数ファイル選択（保有車両）
- プレビュー表示
- アップロード進捗表示
- エラー表示

#### 5.1.2 Props
```typescript
interface ImageUploaderProps {
  /** エンティティタイプ */
  entityType: 'owned-vehicle' | 'product'
  /** エンティティID */
  entityId: string
  /** 既存画像URL配列 */
  currentImages?: string[]
  /** 複数選択可否 */
  multiple?: boolean
  /** 最大ファイル数 */
  maxFiles?: number
  /** アップロード完了コールバック */
  onUploadComplete?: (urls: string[]) => void
  /** 削除コールバック */
  onDelete?: (url: string) => void
}
```

#### 5.1.3 使用例
```tsx
// 保有車両編集画面
<ImageUploader
  entityType="owned-vehicle"
  entityId={vehicleId}
  currentImages={vehicle.imageUrls}
  multiple={true}
  maxFiles={10}
  onUploadComplete={(urls) => {
    updateVehicleImages([...vehicle.imageUrls, ...urls])
  }}
  onDelete={(url) => {
    updateVehicleImages(vehicle.imageUrls.filter(u => u !== url))
  }}
/>

// 製品編集画面
<ImageUploader
  entityType="product"
  entityId={productId}
  currentImages={product.imageUrls}
  multiple={true}
  maxFiles={10}
  onUploadComplete={(urls) => {
    updateProductImages([...product.imageUrls, ...urls])
  }}
  onDelete={(url) => {
    updateProductImages(product.imageUrls.filter(u => u !== url))
  }}
/>
```

### 5.2 ImageGallery コンポーネント

#### 5.2.1 機能
- 画像一覧表示（グリッド）
- 画像クリックで拡大表示（モーダル）
- 削除ボタン（編集モード時）
- 画像順序変更（ドラッグ&ドロップ）

#### 5.2.2 Props
```typescript
interface ImageGalleryProps {
  /** 画像URL配列 */
  images: string[]
  /** 編集モード */
  editable?: boolean
  /** 削除コールバック */
  onDelete?: (url: string) => void
  /** 順序変更コールバック */
  onReorder?: (urls: string[]) => void
}
```

---

## 6. データベース更新

### 6.1 保有車両画像
既存のスキーマで対応済み：
```prisma
model OwnedVehicle {
  // ...
  imageUrls String[] @map("image_urls")
  // ...
}
```

### 6.2 製品画像
**変更**: 単一画像から複数画像に変更
```prisma
model Product {
  // ...
  // 変更前: imageUrl String? @map("image_url") @db.VarChar(500)
  // 変更後:
  imageUrls String[] @default([]) @map("image_urls")
  // ...
}
```

**マイグレーション方法**:
```bash
# Prismaスキーマ変更後
npx prisma db push
```

**既存データの移行** (必要に応じて):
```sql
-- 既存のimageUrlデータをimageUrlsに移行
UPDATE products
SET image_urls = CASE
  WHEN image_url IS NOT NULL THEN ARRAY[image_url]
  ELSE ARRAY[]::text[]
END;
```

---

## 7. 実装ステップ

### Phase 1: ストレージ抽象化レイヤー（1日）
- [ ] ストレージインターフェース定義
- [ ] ストレージファクトリー実装
- [ ] Vercel Blob Storage実装

### Phase 2: API実装（1日）
- [ ] アップロードAPI実装
- [ ] 削除API実装
- [ ] バリデーション実装
- [ ] 権限チェック実装

### Phase 3: UIコンポーネント（2日）
- [ ] ImageUploaderコンポーネント実装
- [ ] ImageGalleryコンポーネント実装
- [ ] ドラッグ&ドロップ機能実装
- [ ] プレビュー・進捗表示実装

### Phase 4: 既存画面への統合（1日）
- [ ] 保有車両追加画面に統合
- [ ] 保有車両編集画面に統合
- [ ] 保有車両詳細画面に統合
- [ ] 製品追加画面に統合
- [ ] 製品編集画面に統合
- [ ] 製品詳細画面に統合

### Phase 5: テスト・デプロイ（1日）
- [ ] Vercel Blob Storage設定
- [ ] 環境変数設定
- [ ] 動作確認
- [ ] デプロイ

---

## 8. セキュリティ考慮事項

### 8.1 認証・認可
- アップロード・削除は認証ユーザーのみ
- 保有車両: 所有者のみ操作可能
- 製品: 作成者または管理者のみ操作可能

### 8.2 ファイル検証
- MIMEタイプチェック
- ファイルサイズチェック
- ファイル名サニタイズ
- 画像形式検証（マジックバイト）

### 8.3 URL安全性
- Vercel Blobの推測不可能なURL使用
- パブリックアクセス（CDN経由）
- HTTPS必須

---

## 9. パフォーマンス最適化

### 9.1 画像最適化
- フロントエンドでリサイズ（推奨: 最大1920x1080）
- WebP形式への変換（オプション）
- 圧縮品質調整（80-90%）

### 9.2 読み込み最適化
- Next.js Image コンポーネント使用
- 遅延読み込み（Lazy Loading）
- プレースホルダー表示

### 9.3 キャッシュ戦略
- CDNキャッシュ: 1ヶ月
- ブラウザキャッシュ: 1週間
- 画像更新時のキャッシュバスト

---

## 10. コスト試算

### 10.1 Vercel Blob Storage料金
- ストレージ: $0.15/GB/月
- 転送: $0.40/GB
- 操作: 最初の10万回/月は無料、その後$0.0005/1000回

### 10.2 想定コスト（月間100ユーザー、1人平均50枚）
- 総画像数: 5,000枚
- 平均サイズ: 500KB/枚
- 総容量: 2.5GB
- **月額コスト**: 約$0.38（ストレージのみ）

---

## 11. 将来の拡張

### 11.1 他ストレージへの移行
設計により以下の変更のみで移行可能：
1. 新しいStorageProvider実装クラス作成
2. `lib/storage/index.ts`のファクトリーに追加
3. 環境変数`STORAGE_PROVIDER`を変更

### 11.2 機能拡張案
- 画像編集機能（トリミング、回転）
- 自動リサイズ・最適化（サーバーサイド）
- 画像AI分析（車両自動認識）
- OCR（品番自動読み取り）

---

## 12. 関連ドキュメント

- [プロジェクト仕様書](./specification.md)
- [開発進捗記録](../../docs/development-log.md)
- [Vercel Blob公式ドキュメント](https://vercel.com/docs/storage/vercel-blob)
