import { useEffect, useState } from 'react'
import { useConfigStore } from '../store/configStore'
import { useWorkStore } from '../store/workStore'
import { toast } from 'sonner'
import { BotStatus, LoginCredentials } from 'src'
import useMyFeedWorkStore from '@renderer/store/myFeedWorkStore'
import useWorkTypeStore from '@renderer/store/workTypeStore'

export function useAgent() {
  const config = useConfigStore((state) => state.config)
  const workList = useWorkStore((state) => state.workList)
  const workType = useWorkTypeStore((state) => state.workType)
  const feedList = useMyFeedWorkStore((state) => state.feedList)

  const { feedWorkModeType, likeCommentsEnabled, replyCommentsEnabled } = useMyFeedWorkStore()
  const [status, setStatus] = useState<BotStatus>({
    isRunning: false,
    currentWork: null,
    waiting: null
  })

  useEffect(() => {
    const interval = setInterval(async () => {
      const currentStatus = await window.agent.getStatus()
      setStatus(currentStatus)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const startAgent = async (credentials: LoginCredentials) => {
    if (!credentials.username || !credentials.password) {
      toast.error('계정 정보가 올바르지 않습니다.')
      return
    }

    if (workType && workType === 'hashtag_and_feed' && workList.length === 0) {
      toast.error('작업이 없습니다.')
      return
    }

    if (workType && workType === 'my_feed' && feedList.length === 0) {
      toast.error('피드 목록이 없습니다.')
      return
    }

    try {
      // config에 credentials 포함
      const agentConfig = {
        ...config,
        credentials: {
          username: credentials.username,
          password: credentials.password
        }
      }

      console.log('Starting agent with config:', {
        username: credentials.username,
        hasPassword: !!credentials.password,
        workListLength: workList.length,
        workType: workType
      })

      if (workType === 'hashtag_and_feed') {
        await window.agent.start({
          config: agentConfig,
          workType: 'hashtag_and_feed',
          workList
        })

        return
      }

      if (workType === 'my_feed') {
        await window.agent.start({
          config: agentConfig,
          workType: 'my_feed',
          workList: [{ feedWorkModeType, likeCommentsEnabled, replyCommentsEnabled, feedList }]
        })

        return
      }
    } catch (error) {
      console.error('Agent start error:', error)
      toast.error('에이전트를 시작하지 못했습니다.', {
        description: (error as Error).message
      })
    }
  }

  const stopAgent = async () => {
    try {
      await window.agent.stop()
    } catch (error) {
      console.error('Agent stop error:', error)
      toast.error('에이전트를 종료하지 못했습니다.', {
        description: (error as Error).message
      })
    }
  }

  return {
    status,
    startAgent,
    stopAgent
  }
}
