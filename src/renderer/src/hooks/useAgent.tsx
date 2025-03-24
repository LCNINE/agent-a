import { CustomToast } from '@renderer/components/CustomToast'
import { useErrorStore } from '@renderer/store/errorStore'
import { useEffect, useState } from 'react'
import { BotStatus, LoginCredentials } from 'src'
import { useConfigStore } from '../store/configStore'
import { useWorkStore } from '../store/workStore'

export function useAgent() {
  const config = useConfigStore((state) => state.config)
  const workList = useWorkStore((state) => state.workList)
  const { clearAllErrors } = useErrorStore()

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
      CustomToast({
        status: 'error',
        message: '계정 정보가 올바르지 않습니다.',
        position: 'top-center',
        duration: 2000
      })
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
        hasPassword: !!credentials.password
      })

      await window.agent.start({
        config: agentConfig,
        workList
      })

      clearAllErrors()
    } catch (error) {
      console.error('Agent start error:', error)

      CustomToast({
        status: 'error',
        message: '에이전트를 시작하지 못했습니다.',
        position: 'top-center',
        duration: 2000,
        description: (error as Error).message
      })
    }
  }

  const stopAgent = async () => {
    try {
      await window.agent.stop()
    } catch (error) {
      console.error('Agent stop error:', error)
      CustomToast({
        status: 'error',
        message: '에이전트를 종료하지 못했습니다.',
        position: 'top-center',
        duration: 2000,
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
