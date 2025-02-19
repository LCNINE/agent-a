import React from "react"
import { createClient } from "@/supabase/client"
import { User } from "@supabase/supabase-js"
import { createContext, ReactNode, useContext, useEffect, useState } from "react"

// Supabase 클라이언트를 한 번만 생성
const supabase = createClient()

export type AuthContextType = {
  user: User | null,
}

export const AuthContext = createContext<AuthContextType>({ user: null })

export function useAuthContext() {
  const auth = useContext(AuthContext)
  if (auth === undefined) {
    throw new Error('useAuthContext should be used within AuthProvider');
  }
  return auth
}

type AuthProviderProps = {
  unauthenticatedFallback: ReactNode,
  children: ReactNode,
}

export function AuthProvider({ unauthenticatedFallback, children }: AuthProviderProps) {
  const [user, setUser] = useState<User|null>(null)

  useEffect(() => {
    // 초기 사용자 상태 설정
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
    })

    const event = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return event.data.subscription.unsubscribe
  }, [])

  if (!user) return unauthenticatedFallback
  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  )
}