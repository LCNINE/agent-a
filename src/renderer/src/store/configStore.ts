
import { LoginCredentials } from "src";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AgentConfig = {
  prompt:
    | {
        preset: "formal" | "casual" | "hyper";
      }
    | {
        preset: "custom";
        custom: string;
      };
  commentLength: {
    min: number;
    max: number;
  };
  postIntervalSeconds: number;
  workIntervalSeconds: number;
  loopIntervalSeconds: number;
  credentials: LoginCredentials
};

export type ConfigState = {
  config: AgentConfig;
  setConfig: (newConfig: Partial<AgentConfig>) => void;
  resetConfig: () => void;
};

const defaultConfig: AgentConfig = {
  prompt: { preset: "casual" },
  commentLength: { min: 20, max: 40 },
  postIntervalSeconds: 600,
  workIntervalSeconds: 600,
  loopIntervalSeconds: 6 * 60 * 60,
  credentials: {
    username: "",
    password: ""
  }
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      config: defaultConfig,
      setConfig: (newConfig) =>
        set((state) => ({
          config: { ...state.config, ...newConfig },
        })),
      resetConfig: () => set({ config: defaultConfig }),
    }),
    {
      name: "config",
    }
  )
);
