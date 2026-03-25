import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import {
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Trash2,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { TargetUser } from 'src'
import { cn } from '@renderer/lib/utils'

interface TargetUserListProps {
  users: TargetUser[]
  onAddUser: (username: string) => void
  onRemoveUser: (username: string) => void
  onClearAll: () => void
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: '대기',
    className: 'text-muted-foreground'
  },
  processing: {
    icon: Loader2,
    label: '처리중',
    className: 'text-apple-blue animate-spin'
  },
  completed: {
    icon: CheckCircle2,
    label: '완료',
    className: 'text-apple-green'
  },
  failed: {
    icon: XCircle,
    label: '실패',
    className: 'text-destructive'
  }
}

export default function TargetUserList({
  users,
  onAddUser,
  onRemoveUser,
  onClearAll
}: TargetUserListProps) {
  const [newUsername, setNewUsername] = useState('')
  const [isListOpen, setIsListOpen] = useState(false)

  const handleAddUser = () => {
    const trimmed = newUsername.replace(/\s+/g, '').replace('@', '')
    if (trimmed) {
      onAddUser(trimmed)
      setNewUsername('')
    }
  }

  const statusCounts = {
    pending: users.filter(u => u.status === 'pending').length,
    processing: users.filter(u => u.status === 'processing').length,
    completed: users.filter(u => u.status === 'completed').length,
    failed: users.filter(u => u.status === 'failed').length
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Input
          type="text"
          placeholder="@username 입력"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddUser()
            }
          }}
          className="flex-grow"
        />
        <Button onClick={handleAddUser} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          추가
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex gap-3">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {statusCounts.pending}
          </span>
          {statusCounts.processing > 0 && (
            <span className="flex items-center gap-1 text-apple-blue">
              <Loader2 className="h-3 w-3 animate-spin" /> {statusCounts.processing}
            </span>
          )}
          <span className="flex items-center gap-1 text-apple-green">
            <CheckCircle2 className="h-3 w-3" /> {statusCounts.completed}
          </span>
          {statusCounts.failed > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <XCircle className="h-3 w-3" /> {statusCounts.failed}
            </span>
          )}
        </div>
        {users.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground hover:text-destructive"
            onClick={onClearAll}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            전체 삭제
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between rounded-xl"
          onClick={() => setIsListOpen(!isListOpen)}
        >
          타겟 유저 목록 ({users.length})
          {isListOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {isListOpen && (
          <ScrollArea className="h-[200px] rounded-xl bg-muted/50 p-3">
            <div className="space-y-2">
              {users.length > 0 ? (
                users.map((user, index) => {
                  const StatusIcon = statusConfig[user.status].icon
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <StatusIcon
                          className={cn('h-4 w-4', statusConfig[user.status].className)}
                        />
                        <span className="text-sm">@{user.username}</span>
                        {user.error && (
                          <span className="text-xs text-destructive">
                            ({user.error})
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => onRemoveUser(user.username)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label={`${user.username} 삭제`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  추가된 타겟 유저가 없습니다.
                </p>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
