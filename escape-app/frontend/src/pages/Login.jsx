import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Login() {
  const { signIn, signInStaff, signInWithGoogle, signInWithFacebook } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [fbLoading, setFbLoading] = useState(false)

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')

  const inputCls = 'input-field w-full mt-1 px-4 py-3 rounded-xl bg-gray-50'
  const labelCls = 'text-xs font-semibold text-gray-500 uppercase tracking-wider'

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Homestay Management System'
    return () => {
      document.title = previousTitle
    }
  }, [])

  async function handleSignin(e) {
    e.preventDefault()
    if (!login || !password) {
      showToast('Enter your email/username and password')
      return
    }

    setLoading(true)
    try {
      await signIn(login, password)
      showToast('Welcome back!')
    } catch (ownerError) {
      try {
        await signInStaff(login, password)
        showToast('Welcome back!')
      } catch (staffError) {
        showToast(staffError.message || ownerError.message || 'Sign in failed')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    try {
      const { data, error } = await signInWithGoogle()
      if (error) throw error
      if (data?.url) {
        window.location.replace(data.url)
      } else {
        showToast('Google sign-in could not be started')
      }
    } catch (err) {
      showToast(err.message || 'Google sign-in failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleFacebookSignIn() {
    setFbLoading(true)
    try {
      const { data, error } = await signInWithFacebook()
      if (error) throw error
      if (data?.url) {
        window.location.replace(data.url)
      } else {
        showToast('Facebook sign-in could not be started')
      }
    } catch (err) {
      showToast(err.message || 'Facebook sign-in failed')
    } finally {
      setFbLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-gradient-to-br from-teal-700 to-teal-900">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/10 rounded-2xl mx-auto mb-4 flex items-center justify-center backdrop-blur">
            <i className="fas fa-mountain text-3xl text-white"></i>
          </div>
          <h1 className="text-3xl font-bold text-white">Homestay Management System</h1>
        </div>
        <div className="card p-6 space-y-4">
          <form onSubmit={handleSignin} className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-gray-800">Sign in</h2>
                  <p className="text-sm text-gray-500">Use your owner or staff credentials to continue.</p>
                </div>
                <div>
                  <label className={labelCls}>Email or username</label>
                  <input
                    id="login-field"
                    type="text"
                    required
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className={inputCls}
                    placeholder="you@gmail.com or your_username"
                    autoComplete="username"
                  />
                </div>
                <div>
                  <label className={labelCls}>Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                    placeholder="******"
                    autoComplete="current-password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full text-white font-semibold py-3 rounded-xl shadow-lg shadow-teal-900/20 mt-2 flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? <span className="spinner"></span> : 'Sign In'}
                </button>
              </form>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-gray-400 font-medium">or continue with</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full bg-white border-2 border-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition"
                >
                  {googleLoading ? (
                    <span className="spinner border-gray-700 border-t-transparent"></span>
                  ) : (
                    <>
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google
                    </>
                  )}
                </button>

                <button
                  onClick={handleFacebookSignIn}
                  disabled={fbLoading}
                  className="w-full bg-[#1877F2] text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-[#166fe5] transition"
                >
                  {fbLoading ? (
                    <span className="spinner border-white border-t-transparent"></span>
                  ) : (
                    <>
                      <svg className="w-5 h-5 shrink-0" fill="white" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-center text-gray-400">
                Sign in with your email, username, Google, or Facebook account.
              </p>
        </div>
      </div>
    </div>
  )
}
