import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Switch } from '@renderer/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { ChevronDown, ChevronUp, FileUp, HelpCircle, Star, Trash2, X } from 'lucide-react'
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
  tooltip?: string
  enabled: boolean
  onToggle: () => void
  hashtags?: string[]
  onAddHashtag?: (tag: string) => void
  onRemoveHashtag?: (tag: string) => void
  onImportHashtags?: () => void
  onClearHashtags?: () => void
  error?: boolean
  children?: React.ReactNode
  showCount?: boolean
}

export default function WorkSection({
  title,
  type,
  icon,
  description,
  tooltip,
  enabled,
  onToggle,
  hashtags,
  onAddHashtag,
  onRemoveHashtag,
  onImportHashtags,
  onClearHashtags,
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
            {tooltip && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 cursor-help text-muted-foreground shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
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
            {onImportHashtags && (
              <Button
                type="button"
                onClick={onImportHashtags}
                size="sm"
                variant="outline"
              >
                <FileUp className="h-4 w-4 mr-1.5" />
                엑셀
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 justify-between rounded-xl"
                onClick={() => setIsHashtagListOpen(!isHashtagListOpen)}
              >
                해시태그 목록 ({hashtags.length || 0})
                {isHashtagListOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              {hashtags.length > 0 && onClearHashtags && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (
                      window.confirm(
                        `해시태그 ${hashtags.length}개를 모두 삭제할까요?\n이 동작은 되돌릴 수 없습니다.`
                      )
                    ) {
                      onClearHashtags()
                    }
                  }}
                  aria-label="해시태그 전체 삭제"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  전체 삭제
                </Button>
              )}
            </div>

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
