import Service from '../Service'
import { Announcement, AnnouncementResponse } from './types'

class AnnouncementService extends Service {
  async getAnnouncements(): Promise<AnnouncementResponse[]> {
    const { data, error } = await (this.supabase as unknown as { from: (table: string) => any })
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get announcements: ${error.message}`)
    }

    if (!data) {
      return []
    }

    return (data as Announcement[]).map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      createdAt: new Date(item.created_at)
    }))
  }

  async getLatestAnnouncementId(): Promise<number | null> {
    const { data, error } = await (this.supabase as unknown as { from: (table: string) => any })
      .from('announcements')
      .select('id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get latest announcement: ${error.message}`)
    }

    return (data as { id: number } | null)?.id ?? null
  }
}

export default AnnouncementService
