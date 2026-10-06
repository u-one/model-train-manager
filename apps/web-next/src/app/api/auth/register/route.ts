import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'

const registrationSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(100)
}).strict()

export async function POST(request: NextRequest) {
  try {
    const parsed = registrationSchema.safeParse(await request.json())
    if (!parsed.success) return apiErrorResponse(parsed.error, '入力値を確認してください')
    const { email, password, name } = parsed.data

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return apiErrorJson('このメールアドレスは既に使用されています', 409, 'CONFLICT')
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 12)

    // ユーザー作成
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      }
    })

    return NextResponse.json({
      message: 'ユーザー登録が完了しました',
      user
    }, { status: 201 })

  } catch (error) {
    return apiErrorResponse(error, 'ユーザー登録中にエラーが発生しました')
  }
}
