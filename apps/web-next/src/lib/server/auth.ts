import 'server-only'
import { getServerSession, type Session } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
)

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email && ADMIN_EMAILS.has(email.trim().toLowerCase()))
}

export async function getAuthContext() {
  const session: Session | null = await getServerSession(authOptions)
  const email = session?.user?.email ?? null
  const user = email
    ? await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true }
      })
    : null

  return {
    session,
    user,
    isAdmin: isAdminEmail(email)
  }
}
