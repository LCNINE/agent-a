import { useEffect, useState } from 'react';
import { useConfigStore } from '../store/configStore';
import { useWorkStore } from '../store/workStore';
import { toast } from 'sonner';
import { BotStatus, LoginCredentials } from 'src';

export function useAgent() {
  const config = useConfigStore(state => state.config);
  const workList = useWorkStore(state => state.workList);
  const [status, setStatus] = useState<BotStatus>({
    isRunning: false,
    currentWork: null,
    waiting: null
  });

  useEffect(() => {
    const interval = setInterval(async () => {
      const currentStatus = await window.agent.getStatus();
      setStatus(currentStatus);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const startAgent = async (credentials: LoginCredentials) => {
    if (workList.length === 0) {
      toast.error("작업이 없습니다.");
      return;
    }

    try {
      // config에 credentials 포함
      const agentConfig = {
        ...config,
        credentials: {
          username: credentials.username,
          password: credentials.password
        }
      };

      console.log('Starting agent with config:', {
        username: credentials.username,
        hasPassword: !!credentials.password,
        workListLength: workList.length
      });

      await window.agent.start({ 
        config: agentConfig, 
        workList 
      });
    } catch (error) {
      console.error('Agent start error:', error);
      toast.error('에이전트를 시작하지 못했습니다.', { 
        description: (error as Error).message 
      });
    }
  };

  const stopAgent = async () => {
    try {
      await window.agent.stop();
    } catch (error) {
      console.error('Agent stop error:', error);
      toast.error('에이전트를 종료하지 못했습니다.', { 
        description: (error as Error).message 
      });
    }
  };

  return {
    status,
    startAgent,
    stopAgent
  };
}