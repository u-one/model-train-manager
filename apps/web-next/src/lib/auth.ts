import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { supabaseAdmin } from './supabase'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          // Supabaseにユーザー情報を保存/更新
          const { data, error } = await supabaseAdmin
            .from('users')
            .upsert({
              email: user.email,
              name: user.name,
              image: user.image,
              email_verified: profile?.email_verified ? new Date() : null,
            }, {
              onConflict: 'email'
            })

          if (error) {
            console.error('Error saving user to Supabase:', error)
            return false
          }

          return true
        } catch (error) {
          console.error('Error in signIn callback:', error)
          return false
        }
      }
      return true
    },
    async session({ session, token }) {
      // セッションにユーザーIDを追加
      if (session.user?.email) {
        const { data } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', session.user.email)
          .single()

        if (data) {
          session.user.id = data.id
        }
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
}