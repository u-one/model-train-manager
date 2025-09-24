import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          })

          if (!user || !user.password) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            image: user.image
          }
        } catch (error) {
          console.error('Error in credentials authorization:', error)
          return null
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      try {
        if (!user.email) return false

        // ユーザーが存在するかチェック
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email }
        })

        // 存在しない場合は新規作成
        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || user.email,
              image: user.image
            }
          })
          console.log('New user created:', user.email)
        } else {
          console.log('Existing user signed in:', user.email)
        }

        return true
      } catch (error) {
        console.error('Error in signIn callback:', error)
        return false
      }
    },
    async session({ session }) {
      // ユーザーIDをセッションに追加
      if (session.user?.email) {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email }
        })
        if (user) {
          session.user.id = user.id.toString()
        }
      }
      return session
    },
    async jwt({ token, user }) {
      // 初回ログイン時にユーザーIDをトークンに保存
      if (user) {
        token.id = user.id
      }
      return token
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
}