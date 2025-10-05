import { StorageProvider } from './interface'
import { VercelBlobStorage } from './vercel-blob'

/**
 * ストレージプロバイダーのファクトリー関数
 * 環境変数STORAGE_PROVIDERに応じて適切な実装を返す
 */
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

// シングルトンインスタンス
let storageInstance: StorageProvider | null = null

/**
 * ストレージプロバイダーインスタンスを取得
 */
export function getStorage(): StorageProvider {
  if (!storageInstance) {
    storageInstance = getStorageProvider()
  }
  return storageInstance
}

// 便利な再エクスポート
export * from './interface'
export const storage = getStorage()
