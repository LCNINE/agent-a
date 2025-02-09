import React from "react"
import { createClient } from "@/supabase/client"
import { User } from "@supabase/supabase-js"
import { createContext, ReactNode, useContext, useEffect, useState } from "react"

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
    const supabase = createClient()
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