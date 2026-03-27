import { CustomToast } from '@renderer/components/CustomToast'
import { useErrorStore } from '@renderer/store/errorStore'
import { useEffect, useState } from 'react'
import { BotStatus, LoginCredentials, StartAgentParams } from 'src'
import { useConfigStore } from '../store/configStore'
import { useWorkStore } from '../store/workStore'

export function useAgent() {
  const config = useConfigStore((state) => state.config)
  const workList = useWorkStore((state) => state.workList)
  const { clearAllErrors } = useErrorStore()

  const [statuses, setStatuses] = useState<Record<string, BotStatus>>({})

  useEffect(() => {
    // 1초마다 전체 상태 폴링
    const interval = setInterval(async () => {
      const allStatuses = await window.agent.getAllStatuses()
      setStatuses(allStatuses)
    }, 1000)

    // 실시간 상태 업데이트 구독
    const unsubscribe = window.agent.onStatusUpdate((agentId, newStatus) => {
      setStatuses((prev) => ({ ...prev, [agentId]: newStatus }))
    })

    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [])

  const startAgent = async (credentials: LoginCredentials, userId: string) => {
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
        workList,
        userId
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

  const stopAgent = async (agentId: string) => {
    try {
      await window.agent.stop(agentId)
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

  const stopAllAgents = async () => {
    try {
      await window.agent.stopAll()
    } catch (error) {
      console.error('Agent stop all error:', error)
    }
  }

  // 하나라도 실행 중인지 확인
  const isAnyRunning = Object.values(statuses).some((s) => s.isRunning)

  // 특정 에이전트 상태 가져오기
  const getAgentStatus = (agentId: string): BotStatus => {
    return statuses[agentId] || {
      isRunning: false,
      currentWork: null,
      waiting: null
    }
  }

  return {
    statuses,
    isAnyRunning,
    getAgentStatus,
    startAgent,
    stopAgent,
    stopAllAgents
  }
}
