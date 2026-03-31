export interface Announcement {
  id: number
  title: string
  content: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AnnouncementResponse {
  id: number
  title: string
  content: string
  createdAt: Date
}
