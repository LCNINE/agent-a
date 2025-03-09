import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/supabase/client'

export const useWorks = () =>
  useSuspenseQuery({
    queryKey: ['works'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('works').select('*')
      if (error) {
        throw error
      }
      return data
    }
  })
