import { StorageProvider, UploadOptions, UploadResult, StorageItem, StorageMetadata } from './interface'
import { writeFile, unlink, readdir, stat, mkdir } from 'fs/promises'
import { dirname, join, relative, resolve, sep } from 'path'

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
      // ファイル名にタイムスタンプを追加してユニークにする
      const timestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      const pathParts = options.pathname.split(/[\\/]+/).filter(Boolean)
      if (pathParts.length === 0 || pathParts.some(part => part === '.' || part === '..')) {
        throw new Error('Invalid upload path')
      }
      const leaf = pathParts.pop() as string
      const filename = options.addRandomSuffix
        ? `${timestamp}-${randomSuffix}-${leaf}`
        : leaf
      const relativeKey = [...pathParts, filename].join('/')
      const filePath = this.resolveFilePath(relativeKey)
      await mkdir(dirname(filePath), { recursive: true })

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
        url: `${this.baseUrl}/${relativeKey.split('/').map(encodeURIComponent).join('/')}`,
        key: relativeKey,
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
      const relativeKey = this.getRelativeKey(key)
      const filePath = this.resolveFilePath(relativeKey)
      await unlink(filePath)
    } catch (error) {
      console.error('Local storage delete error:', error)
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private getRelativeKey(key: string): string {
    let pathValue = key
    if (/^https?:\/\//i.test(key)) {
      const url = new URL(key)
      if (!url.pathname.startsWith(`${this.baseUrl}/`)) {
        throw new Error('Invalid local storage URL')
      }
      pathValue = url.pathname
    }
    if (pathValue.startsWith(`${this.baseUrl}/`)) {
      pathValue = pathValue.slice(this.baseUrl.length + 1)
    }
    return decodeURIComponent(pathValue).replace(/^[/\\]+/, '')
  }

  private resolveFilePath(relativeKey: string): string {
    const filePath = resolve(this.baseDir, relativeKey)
    const pathFromBase = relative(this.baseDir, filePath)
    if (!pathFromBase || pathFromBase === '..' || pathFromBase.startsWith(`..${sep}`) || resolve(this.baseDir) === filePath) {
      throw new Error('Invalid storage path')
    }
    return filePath
  }

  async list(prefix?: string): Promise<StorageItem[]> {
    try {
      const items: StorageItem[] = []
      const visit = async (directory: string): Promise<void> => {
        const entries = await readdir(directory, { withFileTypes: true })
        for (const entry of entries) {
          const filePath = join(directory, entry.name)
          if (entry.isDirectory()) {
            await visit(filePath)
            continue
          }
          if (!entry.isFile()) continue

          const key = relative(this.baseDir, filePath)
          const normalizedKey = key.split(sep).join('/')
          if (prefix && !normalizedKey.startsWith(prefix)) continue

          const stats = await stat(filePath)
          items.push({
            key: normalizedKey,
            url: `${this.baseUrl}/${normalizedKey.split('/').map(encodeURIComponent).join('/')}`,
            size: stats.size,
            uploadedAt: stats.mtime,
          })
        }
      }
      await visit(this.baseDir)

      return items
    } catch (error) {
      console.error('Local storage list error:', error)
      return []
    }
  }

  async getMetadata(key: string): Promise<StorageMetadata> {
    try {
      const relativeKey = this.getRelativeKey(key)
      const filePath = this.resolveFilePath(relativeKey)
      const stats = await stat(filePath)
      const normalizedKey = relativeKey.split(sep).join('/')

      return {
        key: normalizedKey,
        url: `${this.baseUrl}/${normalizedKey.split('/').map(encodeURIComponent).join('/')}`,
        size: stats.size,
        uploadedAt: stats.mtime,
        contentType: this.getContentType(normalizedKey),
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
