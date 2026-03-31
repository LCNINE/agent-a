import { useState } from 'react'
import { Bell } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAnnouncementsQuery, useLatestAnnouncementIdQuery } from '@/service/announcement/queries'
import { useAnnouncementRead } from '@/hooks/useAnnouncementRead'

export default function AnnouncementButton() {
  const [open, setOpen] = useState(false)
  const { data: announcements, isLoading } = useAnnouncementsQuery()
  const { data: latestId } = useLatestAnnouncementIdQuery()
  const { hasUnread, markAsRead } = useAnnouncementRead()

  const showBadge = hasUnread(latestId)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen && latestId != null) {
      markAsRead(latestId)
    }
  }

  return (
    <>
      <Button onClick={() => handleOpenChange(true)} size="icon" className="relative">
        <Bell size={16} />
        {showBadge && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500" />
        )}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>공지사항</DialogTitle>
            <DialogDescription>업데이트 내역 및 공지사항을 확인하세요.</DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-muted-foreground">불러오는 중...</span>
              </div>
            ) : !announcements || announcements.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-muted-foreground">공지사항이 없습니다.</span>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="rounded-lg border bg-card p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm">{announcement.title}</h3>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(announcement.createdAt, 'yyyy.MM.dd', { locale: ko })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
