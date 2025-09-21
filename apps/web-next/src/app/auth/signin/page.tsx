'use client'

import { signIn, getSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui'

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [formMode, setFormMode] = useState<'login' | 'register'>('login')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  useEffect(() => {
    // 既にログインしている場合はダッシュボードにリダイレクト
    getSession().then((session) => {
      if (session) {
        router.push('/dashboard')
      }
    })
  }, [router])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn('google', { callbackUrl: '/dashboard' })
    } catch (error) {
      console.error('Sign in error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setError('メールアドレスまたはパスワードが正しくありません')
      } else if (result?.ok) {
        router.push('/dashboard')
      }
    } catch {
      setError('ログイン中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsRegistering(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('ユーザー登録が完了しました。ログインしてください。')
        setFormMode('login')
        setFormData({ email: formData.email, password: '', name: '' })
      } else {
        setError(data.error || 'ユーザー登録に失敗しました')
      }
    } catch {
      setError('ユーザー登録中にエラーが発生しました')
    } finally {
      setIsRegistering(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            鉄道模型車両管理
          </h1>
          <p className="text-gray-600">
            Nゲージ車両の情報と保有状況を管理
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
                {formMode === 'login' ? 'ログイン' : 'ユーザー登録'}
              </h2>

              {/* エラー・成功メッセージ */}
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                  {success}
                </div>
              )}

              {/* ID/パスワード認証フォーム */}
              <form onSubmit={formMode === 'login' ? handleCredentialsSignIn : handleRegister} className="space-y-4 mb-6">
                {formMode === 'register' && (
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    label="名前"
                    value={formData.name}
                    onChange={handleInputChange}
                    required={formMode === 'register'}
                    placeholder="山田太郎"
                  />
                )}

                <Input
                  id="email"
                  name="email"
                  type="email"
                  label="メールアドレス"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="example@email.com"
                />

                <Input
                  id="password"
                  name="password"
                  type="password"
                  label="パスワード"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder={formMode === 'register' ? '8文字以上で入力' : 'パスワード'}
                />

                <button
                  type="submit"
                  disabled={isLoading || isRegistering}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading || isRegistering ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {formMode === 'login' ? 'ログイン中...' : '登録中...'}
                    </div>
                  ) : (
                    formMode === 'login' ? 'ログイン' : 'ユーザー登録'
                  )}
                </button>
              </form>

              {/* フォーム切り替え */}
              <div className="text-center mb-6">
                <button
                  onClick={() => {
                    setFormMode(formMode === 'login' ? 'register' : 'login')
                    setError('')
                    setSuccess('')
                  }}
                  className="text-blue-600 hover:text-blue-500 text-sm"
                >
                  {formMode === 'login' ? 'アカウントをお持ちでない場合はこちら' : 'ログインに戻る'}
                </button>
              </div>

              {/* 区切り線 */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">または</span>
                </div>
              </div>

              {/* Google認証 */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading || isRegistering}
                className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                    ログイン中...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Googleアカウントでログイン
                  </div>
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                ログインすることで、車両の保有情報を管理できます
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}