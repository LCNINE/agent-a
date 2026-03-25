import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Switch } from '@renderer/components/ui/switch'
import { ChevronDown, ChevronUp, Star, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { WorkCountField } from './WorkCountField'
import { WorkType } from 'src'
import { useErrorStore } from '@renderer/store/errorStore'
import { cn } from '@renderer/lib/utils'

interface WorkSectionProps {
  title: string
  type: string
  icon: React.ReactNode
  description: string
  enabled: boolean
  onToggle: () => void
  hashtags?: string[]
  onAddHashtag?: (tag: string) => void
  onRemoveHashtag?: (tag: string) => void
  error?: boolean
  children?: React.ReactNode
  showCount?: boolean
}

export default function WorkSection({
  title,
  type,
  icon,
  description,
  enabled,
  onToggle,
  hashtags,
  onAddHashtag,
  onRemoveHashtag,
  error,
  children,
  showCount = true
}: WorkSectionProps) {
  const [newHashtag, setNewHashtag] = useState('')
  const [isHashtagListOpen, setIsHashtagListOpen] = useState(false)
  const hashtagInputRef = useRef<HTMLInputElement>(null)
  const { errorTypes } = useErrorStore()

  const handleAddHashtag = () => {
    const trimmedHashtag = newHashtag.replace(/\s+/g, '')
    if (trimmedHashtag && onAddHashtag) {
      onAddHashtag(trimmedHashtag)
      setNewHashtag('')
    }
    hashtagInputRef.current?.focus()
  }

  return (
    <div
      className={cn(
        'relative space-y-4 rounded-2xl border-2 p-5 transition-all duration-200 ease-apple',
        enabled
          ? 'bg-card/80 backdrop-blur-sm shadow-apple-sm hover:shadow-apple-md'
          : 'bg-muted/30',
        error && 'ring-2 ring-apple-blue/50 border-apple-blue'
      )}
    >
      {error && (
        <div className="absolute -right-2 -top-2 animate-pulse">
          <Star className="h-5 w-5 fill-apple-orange text-apple-orange" />
        </div>
      )}

      <div className="flex justify-between">
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60">
              {icon}
            </div>
            <Label className="font-semibold text-base">{title}</Label>
          </div>

          <p className="text-sm text-muted-foreground pl-11">{description}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-4 items-end">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">
                {enabled ? '활성화됨' : '비활성화됨'}
              </span>
              <Switch
                checked={enabled}
                onCheckedChange={onToggle}
              />
            </div>

            {enabled && showCount && <WorkCountField type={type as keyof WorkType} />}
          </div>
        </div>
      </div>

      {hashtags && enabled && onAddHashtag && (
        <div className="pl-11 space-y-3">
          <div className="flex items-center gap-3">
            <Input
              type="text"
              placeholder="해시태그 입력 (# 제외)"
              value={newHashtag}
              onChange={(e) => setNewHashtag(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddHashtag()
                }
              }}
              ref={hashtagInputRef}
              className={cn(
                'flex-grow',
                error && 'ring-2 ring-apple-blue/50 border-apple-blue'
              )}
            />
            <Button onClick={handleAddHashtag} size="sm">
              추가
            </Button>
          </div>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between rounded-xl"
              onClick={() => setIsHashtagListOpen(!isHashtagListOpen)}
            >
              해시태그 목록 ({hashtags.length || 0})
              {isHashtagListOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {isHashtagListOpen && (
              <ScrollArea className="relative h-[120px] rounded-xl bg-muted/50 p-3 scrollbar-apple">
                <div className="space-y-2">
                  {hashtags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {hashtags.map((tag, index) => (
                        <div
                          key={index}
                          className="relative flex items-center rounded-full border bg-background px-3 py-1.5 shadow-apple-sm transition-all duration-150 hover:shadow-apple-md"
                        >
                          <span className="mr-2 text-sm">#{tag}</span>

                          {onRemoveHashtag && (
                            <button
                              onClick={() => onRemoveHashtag(tag)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              aria-label={`${tag} 태그 삭제`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">추가된 해시태그가 없습니다.</p>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      )}

      {children && enabled && (
        <div className="pl-11 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}
