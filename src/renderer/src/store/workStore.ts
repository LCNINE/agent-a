import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Work = ({
  type: "feed"
} | {
  type: "hashtag",
  tag: string,
}) & {
  id: string,
}

interface WorkState {
  workList: Work[],
  add(work: Work): void,
  move(id: string, delta: number): void,
  up(id: string): void,
  down(id: string): void,
  remove(id: string): void,
  update(work: Work): void,
}

export const useWorkStore = create<WorkState>()(
  persist(
    (set) => ({
      workList: [],

      // 새 Work를 리스트에 추가
      add(work) {
        set((state) => ({
          workList: [...state.workList, work],
        }));
      },

      // 특정 id의 위치를 delta만큼 이동
      move(id, delta) {
        set((state) => {
          const fromIndex = state.workList.findIndex((w) => w.id === id);
          if (fromIndex < 0) return { workList: state.workList }; // 못 찾은 경우

          const toIndex = fromIndex + delta;
          if (toIndex < 0 || toIndex >= state.workList.length) {
            return { workList: state.workList }; // 범위를 벗어나는 경우
          }

          const newList = [...state.workList];
          const [removed] = newList.splice(fromIndex, 1);
          newList.splice(toIndex, 0, removed);

          return { workList: newList };
        });
      },

      // up = delta: -1
      up(id) {
        set((state) => {
          const fromIndex = state.workList.findIndex((w) => w.id === id);
          if (fromIndex <= 0) return { workList: state.workList };

          const newList = [...state.workList];
          const [removed] = newList.splice(fromIndex, 1);
          newList.splice(fromIndex - 1, 0, removed);

          return { workList: newList };
        });
      },

      // down = delta: +1
      down(id) {
        set((state) => {
          const fromIndex = state.workList.findIndex((w) => w.id === id);
          // 이미 리스트 마지막에 있거나 못 찾으면 아무 것도 안 함
          if (fromIndex < 0 || fromIndex === state.workList.length - 1) {
            return { workList: state.workList };
          }

          const newList = [...state.workList];
          const [removed] = newList.splice(fromIndex, 1);
          newList.splice(fromIndex + 1, 0, removed);

          return { workList: newList };
        });
      },

      // 해당 id 제외
      remove(id) {
        set((state) => ({
          workList: state.workList.filter((w) => w.id !== id),
        }));
      },

      update(work) {
        set((state) => ({
          workList: state.workList.map((w) => w.id === work.id ? work : w)
        }))
      }
    }),
    {
      name: "work", // localStorage 등에 저장될 key
    },
  ),
);