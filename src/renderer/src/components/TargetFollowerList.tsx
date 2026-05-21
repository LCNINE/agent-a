import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  X,
  XCircle
} from 'lucide-react'
import { TargetFollowerCollectionTarget } from 'src'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@renderer/components/ui/alert-dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { cn } from '@renderer/lib/utils'

interface TargetFollowerListProps {
  users: TargetFollowerCollectionTarget[]
  onAddUser: (username: string, groupName?: string) => void
  onRemoveUser: (username: string) => void
  onResetUser: (username: string) => void
  onUpdateGroup: (username: string, groupName: string) => void
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
    label: '수집중',
    className: 'text-apple-blue animate-spin'
  },
  waiting: {
    icon: Clock,
    label: '다음날 대기',
    className: 'text-apple-orange'
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

const ITEMS_PER_PAGE = 100

function formatNumber(value?: number): string {
  if (value === undefined || Number.isNaN(value)) return '-'
  return value.toLocaleString()
}

function formatNextRun(value?: number): string | null {
  if (!value) return null
  return new Date(value).toLocaleString()
}

export default function TargetFollowerList({
  users,
  onAddUser,
  onRemoveUser,
  onResetUser,
  onUpdateGroup,
  onClearAll
}: TargetFollowerListProps) {
  const [newUsername, setNewUsername] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [isListOpen, setIsListOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE)
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return users.slice(start, start + ITEMS_PER_PAGE)
  }, [users, currentPage])

  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages)
  }

  const handleAddUser = () => {
    const trimmed = newUsername
      .trim()
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/^@/, '')
      .split(/[/?#]/)[0]
      .replace(/\s+/g, '')

    if (trimmed) {
      onAddUser(trimmed, newGroupName.trim() || undefined)
      setNewUsername('')
      setNewGroupName('')
    }
  }

  const statusCounts = {
    pending: users.filter((u) => u.status === 'pending').length,
    processing: users.filter((u) => u.status === 'processing').length,
    waiting: users.filter((u) => u.status === 'waiting').length,
    completed: users.filter((u) => u.status === 'completed').length,
    failed: users.filter((u) => u.status === 'failed').length
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="text"
          placeholder="@target_username 입력"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAddUser()
            }
          }}
          className="flex-grow"
        />
        <Input
          type="text"
          placeholder="그룹명 예: 속눈썹펌"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAddUser()
            }
          }}
          className="w-full sm:w-40"
        />
        <Button type="button" onClick={handleAddUser} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          추가
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-3">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {statusCounts.pending}
          </span>
          {statusCounts.processing > 0 && (
            <span className="flex items-center gap-1 text-apple-blue">
              <Loader2 className="h-3 w-3 animate-spin" /> {statusCounts.processing}
            </span>
          )}
          {statusCounts.waiting > 0 && (
            <span className="flex items-center gap-1 text-apple-orange">
              <Clock className="h-3 w-3" /> {statusCounts.waiting}
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
            type="button"
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
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-between rounded-xl"
          onClick={() => setIsListOpen(!isListOpen)}
        >
          팔로워 수집 타겟 ({users.length})
          {isListOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {isListOpen && (
          <>
            <ScrollArea className="h-[220px] rounded-xl bg-muted/50 p-3">
              <div className="space-y-2">
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => {
                    const StatusIcon = statusConfig[user.status].icon
                    const nextRun = formatNextRun(user.nextRunAt)

                    return (
                      <div
                        key={user.username}
                        className="flex items-start justify-between gap-3 rounded-lg border bg-background px-3 py-2 shadow-sm"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <StatusIcon className={cn('h-4 w-4', statusConfig[user.status].className)} />
                            <span className="truncate text-sm">@{user.username}</span>
                            {user.groupName && (
                              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                {user.groupName}
                              </span>
                            )}
                            <span className={cn('text-xs', statusConfig[user.status].className)}>
                              {statusConfig[user.status].label}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            수집 {formatNumber(user.collectedCount)} / 팔로워 {formatNumber(user.followerCount)}
                            {nextRun ? ` · 다음 실행 ${nextRun}` : ''}
                          </div>
                          <Input
                            type="text"
                            value={user.groupName || ''}
                            placeholder="그룹명"
                            onChange={(e) => onUpdateGroup(user.username, e.target.value)}
                            className="h-7 max-w-[180px] text-xs"
                          />
                          {user.error && <div className="text-xs text-destructive">{user.error}</div>}
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                type="button"
                                className="text-muted-foreground transition-colors hover:text-apple-blue disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={`${user.username} 대기 초기화`}
                                title="대기 초기화"
                                disabled={user.status === 'processing'}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>@{user.username} 대기 상태를 초기화할까요?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  이 타겟의 다음 실행 예약을 해제합니다. 기존에 저장된 팔로워 데이터는 삭제하지 않고,
                                  에이전트를 다시 실행하면 바로 수집 가능 여부를 확인합니다.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onResetUser(user.username)}>
                                  대기 초기화
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <button
                            type="button"
                            onClick={() => onRemoveUser(user.username)}
                            className="text-muted-foreground transition-colors hover:text-destructive"
                            aria-label={`${user.username} 삭제`}
                            title="삭제"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    추가된 팔로워 수집 타겟이 없습니다.
                  </p>
                )}
              </div>
            </ScrollArea>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[80px] text-center text-xs text-muted-foreground">
                  {currentPage} / {totalPages} 페이지
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
