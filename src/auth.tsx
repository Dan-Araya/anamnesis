import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { cloudConfigured, supabase } from '@/lib/supabase'

interface AuthState {
  configured: boolean
  loading: boolean
  user: User | null
  sendMagicLink(email: string): Promise<void>
  signOut(): Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(cloudConfigured)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    void client.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    let removeDeepLinkListener: (() => Promise<void>) | undefined
    if (Capacitor.isNativePlatform()) {
      void CapacitorApp.addListener('appUrlOpen', ({ url }) => {
        const parsed = new URL(url)
        const code = parsed.searchParams.get('code')
        if (code) {
          void client.auth.exchangeCodeForSession(code)
          return
        }
        const hash = new URLSearchParams(parsed.hash.slice(1))
        const accessToken = hash.get('access_token')
        const refreshToken = hash.get('refresh_token')
        if (accessToken && refreshToken) {
          void client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        }
      }).then((handle) => {
        removeDeepLinkListener = () => handle.remove()
      })
    }

    return () => {
      data.subscription.unsubscribe()
      void removeDeepLinkListener?.()
    }
  }, [])

  const sendMagicLink = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase no está configurado')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: Capacitor.isNativePlatform()
          ? 'cl.danaraya.anamnesis://auth/callback'
          : window.location.href.split('#')[0],
      },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const value = useMemo(
    () => ({ configured: cloudConfigured, loading, user, sendMagicLink, signOut }),
    [loading, user, sendMagicLink, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return value
}
