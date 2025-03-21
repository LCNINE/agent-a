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
  error
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
      className={`${error && 'border-2 border-blue-500'} relative space-y-4 rounded-md border p-4`}
    >
      {error && (
        <div className="absolute -right-2 -top-2 animate-pulse">
          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        </div>
      )}

      <div className="flex justify-between">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-1">
            {icon}
            <Label className="font-medium">{title}</Label>
          </div>

          <p className="text-sm text-gray-600">{description}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">
                {enabled ? '활성화됨' : '비활성화됨'}
              </span>
              <Switch
                checked={enabled}
                onCheckedChange={onToggle}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>

            {/* 작업 개수 설정 필드 */}
            {enabled && <WorkCountField type={type as keyof WorkType} />}
          </div>
        </div>
      </div>

      {hashtags && enabled && onAddHashtag && (
        <div>
          <div className="flex items-center mb-2 space-x-2">
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
              className={`${error && 'animate-pulse border-2 border-blue-500'} flex-grow`}
            />
            <Button onClick={handleAddHashtag} size="sm">
              추가
            </Button>
          </div>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="justify-between w-full"
              onClick={() => setIsHashtagListOpen(!isHashtagListOpen)}
            >
              해시태그 목록 ({hashtags.length || 0})
              {isHashtagListOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>

            {isHashtagListOpen && (
              <ScrollArea className="relative h-[120px] rounded-md bg-gray-50 p-2 dark:bg-gray-800">
                <div className="space-y-2">
                  {hashtags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {hashtags.map((tag, index) => (
                        <div
                          key={index}
                          className="relative flex items-center px-3 py-1 bg-white border rounded-full shadow-sm"
                        >
                          <span className="mr-2 text-sm dark:text-input">#{tag}</span>
                          {onRemoveHashtag && (
                            <button
                              onClick={() => onRemoveHashtag(tag)}
                              className="text-gray-500 hover:text-gray-700"
                              aria-label={`${tag} 태그 삭제`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">추가된 해시태그가 없습니다.</p>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
