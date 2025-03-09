import React from 'react'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Switch } from '@renderer/components/ui/switch'
import { Trash2, ExternalLink, CheckCircle2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import useMyFeedWorkStore from '@renderer/store/myFeedWorkStore'
import { Feed } from 'src'
import { toast } from 'sonner'

const FeedItem = ({ feed }: { feed: Feed }) => {
  const { toggleFeedActive, removeFeed } = useMyFeedWorkStore()

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center">
              <h4 className="truncate text-sm font-medium">{feed.name}</h4>
              <a
                href={feed.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-muted-foreground hover:text-foreground"
                aria-label="새 탭에서 피드 열기"
                tabIndex={0}
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="truncate text-xs text-muted-foreground">{feed.url}</p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <Switch
                checked={feed.active}
                onCheckedChange={() => {
                  const newActiveState = !feed.active
                  toggleFeedActive(feed.id)
                  toast.success(
                    newActiveState
                      ? `${feed.name} 피드가 활성화되었습니다`
                      : `${feed.name} 피드가 비활성화되었습니다`,
                    {
                      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
                      className:
                        'border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600',
                      duration: 3000
                    }
                  )
                }}
                aria-label={feed.active ? '피드 비활성화' : '피드 활성화'}
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeFeed(feed.id)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="피드 삭제"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default FeedItem
