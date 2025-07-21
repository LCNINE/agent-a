import { useSuspenseQuery } from '@tanstack/react-query'
import useCreateClient from '@/supabase/client'

export const useWorks = () =>
  useSuspenseQuery({
    queryKey: ['works'],
    queryFn: async () => {
      const supabase = useCreateClient()
      // @ts-ignore - works table is used locally
      const { data, error } = await supabase.from('works').select('*')
      if (error) {
        throw error
      }
      return data
    }
  })
