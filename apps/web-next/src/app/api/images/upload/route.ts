import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStorage } from '@/lib/storage'

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
    // 認証チェック
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // FormDataを取得
    const formData = await request.formData()
    const file = formData.get('file') as File
    const entityType = formData.get('entityType') as string
    const entityId = formData.get('entityId') as string

    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 })
    }

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'エンティティ情報が不足しています' }, { status: 400 })
    }

    // ファイル形式チェック
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: '許可されていないファイル形式です',
        details: `許可されている形式: ${ALLOWED_MIME_TYPES.join(', ')}`
      }, { status: 400 })
    }

    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: 'ファイルサイズが大きすぎます',
        details: `最大サイズ: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      }, { status: 400 })
    }

    // TODO: 権限チェック（エンティティの所有者または作成者のみアップロード可能）
    // 保有車両の場合: userId === session.user.id
    // 製品の場合: createdByUserId === session.user.id または管理者

    // ファイル名をサニタイズ
    const timestamp = Date.now()
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const pathname = `${entityType}s/${entityId}/${timestamp}-${originalName}`

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
    console.error('Image upload error:', error)
    return NextResponse.json({
      error: '画像のアップロードに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
