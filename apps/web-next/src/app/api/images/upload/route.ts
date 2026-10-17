import { NextRequest, NextResponse } from 'next/server'
import { getStorage } from '@/lib/storage'
import { authorizeImageEntity } from '@/lib/server/image-auth'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'

// 許可される画像形式
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]

// 最大ファイルサイズ（5MB）
const MAX_FILE_SIZE = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // FormDataを取得
    const formData = await request.formData()
    const fileValue = formData.get('file')
    const entityTypeValue = formData.get('entityType')
    const entityIdValue = formData.get('entityId')

    if (!(fileValue instanceof File)) {
      return apiErrorJson('ファイルが選択されていません', 400, 'VALIDATION_ERROR')
    }

    const access = await authorizeImageEntity(
      typeof entityTypeValue === 'string' ? entityTypeValue : null,
      typeof entityIdValue === 'string' ? entityIdValue : null
    )
    if (!access.ok) {
      return apiErrorJson(access.error, access.status, access.code)
    }
    const file = fileValue

    // ファイル形式チェック
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return apiErrorJson('許可されていないファイル形式です', 400, 'VALIDATION_ERROR', `許可されている形式: ${ALLOWED_MIME_TYPES.join(', ')}`)
    }

    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return apiErrorJson('ファイルサイズが大きすぎます', 400, 'VALIDATION_ERROR', `最大サイズ: ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    // ファイル名をサニタイズ
    const timestamp = Date.now()
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const pathname = `${access.entityType}s/${access.entityId}/${timestamp}-${originalName}`

    // ストレージにアップロード
    const storage = getStorage()
    const result = await storage.upload(file, {
      pathname,
      access: 'public',
      contentType: file.type,
      cacheControlMaxAge: 31536000, // 1年
      addRandomSuffix: true,
    })

    return NextResponse.json({
      url: result.url,
      key: result.key,
      size: result.size,
    })

  } catch (error) {
    return apiErrorResponse(error, '画像のアップロードに失敗しました')
  }
}
