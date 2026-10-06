import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { AuthorizationError } from '@/lib/admin-auth'
import type { ApiErrorCode } from '@/lib/contracts/api'

export function apiErrorJson(
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 500,
  code: ApiErrorCode,
  details?: unknown
) {
  return NextResponse.json({ error: message, code, ...(details === undefined ? {} : { details }) }, { status })
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 401 | 403 | 404 | 409,
    readonly code: ApiErrorCode,
    readonly details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function apiErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof AuthorizationError) {
    return apiErrorJson(error.message, error.status, error.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN')
  }
  if (error instanceof ApiError) {
    return apiErrorJson(error.message, error.status, error.code, error.details)
  }
  if (error instanceof ZodError) {
    return apiErrorJson('入力値を確認してください', 400, 'VALIDATION_ERROR', error.issues.map(issue => ({ path: issue.path, message: issue.message })))
  }
  if (error instanceof SyntaxError) {
    return apiErrorJson('JSON形式が正しくありません', 400, 'VALIDATION_ERROR')
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return apiErrorJson('同じ値が既に登録されています', 409, 'CONFLICT')
    }
    if (error.code === 'P2025') {
      return apiErrorJson('対象が見つかりません', 404, 'NOT_FOUND')
    }
    if (error.code === 'P2003') {
      return apiErrorJson('関連データが残っているため処理できません', 409, 'CONFLICT')
    }
    if (error.code === 'P2000') {
      return apiErrorJson('入力値が保存可能な長さを超えています', 400, 'VALIDATION_ERROR')
    }
  }
  console.error(fallbackMessage, error)
  return apiErrorJson(fallbackMessage, 500, 'INTERNAL_ERROR')
}
