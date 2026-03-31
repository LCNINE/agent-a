import { useQuery } from '@tanstack/react-query'
import AnnouncementService from './announcementService'
import { AnnouncementResponse } from './types'
import useCreateClient from '@/supabase/client'

export function useAnnouncementsQuery() {
  const supabase = useCreateClient()
  return useQuery<AnnouncementResponse[]>({
    queryKey: ['announcements'],
    queryFn: () => new AnnouncementService(supabase).getAnnouncements()
  })
}

export function useLatestAnnouncementIdQuery() {
  const supabase = useCreateClient()
  return useQuery<number | null>({
    queryKey: ['latestAnnouncementId'],
    queryFn: () => new AnnouncementService(supabase).getLatestAnnouncementId()
  })
}
