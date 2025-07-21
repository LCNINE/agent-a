// src>service>account>queries.ts
import { useQuery } from '@tanstack/react-query'
import AccountService from './accountService'
import useCreateClient from '@/supabase/client'

export function useAccountQuery(userId: string | undefined) {
  const supabase = useCreateClient()
  return useQuery({
    queryKey: ['accounts', userId],
    queryFn: async () => {
      if (!userId) return []

      return new AccountService(supabase).fetchAccounts(userId)
    },
    enabled: !!userId // userId가 없으면 요청하지 않음
  })
}
