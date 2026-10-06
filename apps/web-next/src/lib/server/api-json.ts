import { NextResponse } from 'next/server'
import type { Jsonify } from '@/lib/contracts/api'

export function apiJson<T>(data: T, init?: ResponseInit): NextResponse<Jsonify<T>> {
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  return new NextResponse(JSON.stringify(data), {
    ...init,
    headers
  }) as NextResponse<Jsonify<T>>
}

export function apiJsonAs<Contract>() {
  return <T>(
    data: T & (Jsonify<T> extends Contract ? unknown : { __actual: Jsonify<T>; __expected: Contract }),
    init?: ResponseInit
  ): NextResponse<Contract> => apiJson(data, init) as NextResponse<Contract>
}
