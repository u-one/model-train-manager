import { StorageProvider } from './interface'
import { VercelBlobStorage } from './vercel-blob'
import { LocalStorage } from './local'

/**
 * ストレージプロバイダーのファクトリー関数
 * 環境変数STORAGE_PROVIDERに応じて適切な実装を返す
 */
export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || 'auto'

  switch (provider) {
    case 'vercel-blob':
      return new VercelBlobStorage()
    case 'local':
      return new LocalStorage()
    case 'auto':
      // BLOB_READ_WRITE_TOKENがあればVercel Blob、なければローカル
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        return new VercelBlobStorage()
      } else {
        console.warn('⚠️  BLOB_READ_WRITE_TOKEN not found. Using local file storage for development.')
        return new LocalStorage()
      }
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
