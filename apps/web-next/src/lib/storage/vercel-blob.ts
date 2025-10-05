import { put, del, list, head } from '@vercel/blob'
import { StorageProvider, UploadOptions, UploadResult, StorageItem, StorageMetadata } from './interface'

/**
 * Vercel Blob Storage実装
 */
export class VercelBlobStorage implements StorageProvider {
  async upload(file: File | Buffer, options: UploadOptions): Promise<UploadResult> {
    const blob = await put(options.pathname, file, {
      access: 'public', // Vercel Blobは現在publicのみサポート
      contentType: options.contentType,
      cacheControlMaxAge: options.cacheControlMaxAge,
      addRandomSuffix: options.addRandomSuffix ?? true,
    })

    return {
      url: blob.url,
      key: blob.pathname,
      size: file instanceof File ? file.size : file.length,
      uploadedAt: new Date(),
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
      size: blob.size || 0,
      uploadedAt: new Date(blob.uploadedAt || Date.now()),
    }))
  }

  async getMetadata(url: string): Promise<StorageMetadata> {
    const blob = await head(url)
    return {
      contentType: blob.contentType || 'application/octet-stream',
      size: blob.size || 0,
      uploadedAt: new Date(blob.uploadedAt || Date.now()),
      cacheControl: blob.cacheControl,
    }
  }
}
