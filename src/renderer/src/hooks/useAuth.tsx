import React from 'react'
import useCreateClient from '@/supabase/client'
import { User } from '@supabase/supabase-js'
import { createContext, ReactNode, useContext, useEffect, useState } from 'react'

export type AuthContextType = {
  user: User | null
}

export const AuthContext = createContext<AuthContextType>({ user: null })

export function useAuthContext() {
  const auth = useContext(AuthContext)
  if (auth === undefined) {
    throw new Error('useAuthContext should be used within AuthProvider')
  }
  return auth
}

type AuthProviderProps = {
  unauthenticatedFallback: ReactNode
  children: ReactNode
}

export function AuthProvider({ unauthenticatedFallback, children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const supabase = useCreateClient()
  useEffect(() => {
    // 초기 사용자 상태 설정
    const initUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user ?? null)
    }
    initUser()

    const event = supabase.auth.onAuthStateChange((_event, session) => {
      // 이전 상태와 비교하여 변경이 있을 때만 업데이트
      setUser((prevUser) => {
        if (prevUser?.id === session?.user?.id) return prevUser
        return session?.user ?? null
      })
    })

    return event.data.subscription.unsubscribe
  }, [])

  const memoizedValue = React.useMemo(() => ({ user }), [user])

  if (!user) return unauthenticatedFallback
  return <AuthContext.Provider value={memoizedValue}>{children}</AuthContext.Provider>
}
