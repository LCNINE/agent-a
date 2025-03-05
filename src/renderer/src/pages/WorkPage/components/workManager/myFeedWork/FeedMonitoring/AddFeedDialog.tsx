import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import React, { useState } from 'react'
import useMyFeedWorkStore from '@renderer/store/myFeedWorkStore'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'

interface AddFeedDialogProps {
  isOpen: boolean
  onClose: () => void
}

const AddFeedDialog = ({ isOpen, onClose }: AddFeedDialogProps) => {
  const { addFeed, feeds } = useMyFeedWorkStore()
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [newFeedName, setNewFeedName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!newFeedUrl.trim()) return

    setIsLoading(true)

    setTimeout(() => {
      addFeed({
        id: feeds.length,
        url: newFeedUrl.trim(),
        name: newFeedName.trim() !== '' ? newFeedName : `피드 ${feeds.length + 1}`,
        active: true
      })

      setIsLoading(false)
      handleClose()
      toast.success('새 피드가 추가되었습니다', {
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        className:
          'border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600',
        duration: 3000
      })
    }, 500)
  }

  const handleClose = () => {
    setNewFeedUrl('')
    setNewFeedName('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>피드 추가</DialogTitle>
            <DialogDescription>모니터링할 피드의 URL을 입력하세요</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="feed-url" className="col-span-4">
                피드 URL
              </Label>
              <Input
                id="feed-url"
                placeholder="https://instagram.com/feed"
                value={newFeedUrl}
                onChange={(e) => setNewFeedUrl(e.target.value)}
                className="col-span-4"
                aria-label="피드 URL 입력"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feed-name">피드 이름 (선택사항)</Label>
              <Input
                id="feed-name"
                placeholder="피드 이름"
                value={newFeedName}
                onChange={(e) => setNewFeedName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              aria-label="취소"
            >
              취소
            </Button>
            <Button type="submit" disabled={!newFeedUrl.trim() || isLoading} aria-label="추가">
              {isLoading ? '추가 중...' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddFeedDialog
