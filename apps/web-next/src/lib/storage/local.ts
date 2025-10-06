import { StorageProvider, UploadOptions, UploadResult, StorageItem, StorageMetadata } from './interface'
import { writeFile, unlink, readdir, stat } from 'fs/promises'
import { join } from 'path'

/**
 * ローカルファイルシステムストレージプロバイダー
 * 開発環境用
 */
export class LocalStorage implements StorageProvider {
  private baseDir: string
  private baseUrl: string

  constructor() {
    // public/uploads ディレクトリに保存
    this.baseDir = join(process.cwd(), 'public', 'uploads')
    this.baseUrl = '/uploads'
  }

  async upload(file: File | Buffer, options: UploadOptions): Promise<UploadResult> {
    try {
      // ディレクトリ作成（存在しない場合）
      const { mkdir } = await import('fs/promises')
      await mkdir(this.baseDir, { recursive: true })

      // ファイル名にタイムスタンプを追加してユニークにする
      const timestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      const filename = options.addRandomSuffix
        ? `${timestamp}-${randomSuffix}-${options.pathname.split('/').pop()}`
        : options.pathname.replace(/\//g, '-')

      const filePath = join(this.baseDir, filename)

      // ファイルを保存
      let buffer: Buffer
      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer()
        buffer = Buffer.from(arrayBuffer)
      } else {
        buffer = file
      }

      await writeFile(filePath, buffer)

      const size = file instanceof File ? file.size : file.length

      return {
        url: `${this.baseUrl}/${filename}`,
        key: filename,
        size,
        uploadedAt: new Date(),
      }
    } catch (error) {
      console.error('Local storage upload error:', error)
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = join(this.baseDir, key)
      await unlink(filePath)
    } catch (error) {
      console.error('Local storage delete error:', error)
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async list(prefix?: string): Promise<StorageItem[]> {
    try {
      const files = await readdir(this.baseDir)
      const filteredFiles = prefix
        ? files.filter(f => f.startsWith(prefix))
        : files

      const items: StorageItem[] = []
      for (const file of filteredFiles) {
        const filePath = join(this.baseDir, file)
        const stats = await stat(filePath)

        items.push({
          key: file,
          url: `${this.baseUrl}/${file}`,
          size: stats.size,
          uploadedAt: stats.mtime,
        })
      }

      return items
    } catch (error) {
      console.error('Local storage list error:', error)
      return []
    }
  }

  async getMetadata(key: string): Promise<StorageMetadata> {
    try {
      const filePath = join(this.baseDir, key)
      const stats = await stat(filePath)

      return {
        key,
        url: `${this.baseUrl}/${key}`,
        size: stats.size,
        uploadedAt: stats.mtime,
        contentType: this.getContentType(key),
      }
    } catch (error) {
      console.error('Local storage getMetadata error:', error)
      throw new Error(`Failed to get metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    }
    return mimeTypes[ext || ''] || 'application/octet-stream'
  }
}
