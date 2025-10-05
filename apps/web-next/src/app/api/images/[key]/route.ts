import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStorage } from '@/lib/storage'

interface RouteParams {
  params: Promise<{ key: string }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { key } = await params

    if (!key) {
      return NextResponse.json({ error: 'キーが指定されていません' }, { status: 400 })
    }

    // URLデコード（パスに含まれる場合）
    const decodedKey = decodeURIComponent(key)

    // TODO: 権限チェック（エンティティの所有者または作成者のみ削除可能）
    // キーからエンティティタイプとIDを抽出して権限確認

    // ストレージから削除
    const storage = getStorage()
    await storage.delete(decodedKey)

    return NextResponse.json({
      message: 'Image deleted successfully'
    })

  } catch (error) {
    console.error('Image delete error:', error)
    return NextResponse.json({
      error: '画像の削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
