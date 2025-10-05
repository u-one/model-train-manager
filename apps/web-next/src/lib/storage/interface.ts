/**
 * ストレージサービスの抽象化インターフェース
 * 将来的に異なるストレージプロバイダー（AWS S3, Supabase Storage等）に切り替え可能
 */

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
  /** キャッシュ制御（秒数） */
  cacheControlMaxAge?: number
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
