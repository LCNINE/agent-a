import { Label } from '@renderer/components/ui/label'
import { Switch } from '@renderer/components/ui/switch'
import useMyFeedWorkStore from '@renderer/store/myFeedWorkStore'

interface InteractionSettingsProps {
  likeCommentsEnabled: boolean
  replyCommentsEnabled: boolean
  toggleLikeComments: (checked: boolean) => void
  toggleReplyComments: (checked: boolean) => void
}

const InteractionSettings = () => {
  const { likeCommentsEnabled, replyCommentsEnabled, toggleLikeComments, toggleReplyComments } =
    useMyFeedWorkStore()

  const handleLikeCommentsChange = (checked: boolean) => {
    toggleLikeComments(checked)
  }

  const handleReplyCommentsChange = (checked: boolean) => {
    toggleReplyComments(checked)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="like-comments">댓글 좋아요</Label>
          <p className="text-sm text-muted-foreground">피드 댓글에 좋아요를 자동으로 누릅니다</p>
        </div>
        <Switch
          id="like-comments"
          checked={likeCommentsEnabled}
          onCheckedChange={handleLikeCommentsChange}
          aria-label="댓글 좋아요 활성화"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="reply-comments">대댓글 작성</Label>
          <p className="text-sm text-muted-foreground">피드 댓글에 자동으로 답글을 작성합니다</p>
        </div>
        <Switch
          id="reply-comments"
          checked={replyCommentsEnabled}
          onCheckedChange={handleReplyCommentsChange}
          aria-label="대댓글 작성 활성화"
        />
      </div>
    </div>
  )
}

export default InteractionSettings
