import { LoginCredentials } from "src"
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AccountState {
  accountList: LoginCredentials[];
  selectedAccount: LoginCredentials | null;
  syncAccounts(accounts: LoginCredentials[]): void;
  move(username: string, delta: number): void;
  up(username: string): void;
  down(username: string): void;
  updatePassword(credentials: LoginCredentials): void;
  selectAccount(credentials: LoginCredentials): void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      accountList: [],
      selectedAccount: null,

      syncAccounts(accounts) {
        set((state) => ({
          accountList: accounts.map(account => ({
            username: account.username,
            password: state.accountList.find(a => a.username === account.username)?.password || ''
          }))
        }));
      },

      move(username, delta) {
        set((state) => {
          const fromIndex = state.accountList.findIndex((a) => a.username === username);
          if (fromIndex < 0) return { accountList: state.accountList }; // 못 찾은 경우

          const toIndex = fromIndex + delta;
          if (toIndex < 0 || toIndex >= state.accountList.length) {
            return { accountList: state.accountList }; // 범위를 벗어나는 경우
          }

          const newList = [...state.accountList];
          const [removed] = newList.splice(fromIndex, 1);
          newList.splice(toIndex, 0, removed);

          return { accountList: newList };
        });
      },

      up(username) {
        set((state) => {
          const fromIndex = state.accountList.findIndex((a) => a.username === username);
          if (fromIndex <= 0) return { accountList: state.accountList };

          const newList = [...state.accountList];
          const [removed] = newList.splice(fromIndex, 1);
          newList.splice(fromIndex - 1, 0, removed);

          return { accountList: newList };
        });
      },

      down(username) {
        set((state) => {
          const fromIndex = state.accountList.findIndex((a) => a.username === username);
          if (fromIndex < 0 || fromIndex === state.accountList.length - 1) {
            return { accountList: state.accountList };
          }

          const newList = [...state.accountList];
          const [removed] = newList.splice(fromIndex, 1);
          newList.splice(fromIndex + 1, 0, removed);

          return { accountList: newList };
        });
      },

      updatePassword(credentials) {
        set((state) => {
          const newList = state.accountList.map((a) => 
            a.username === credentials.username ? credentials : a
          );
          
          // selectedAccount도 함께 업데이트
          const newSelectedAccount = state.selectedAccount?.username === credentials.username
            ? credentials
            : state.selectedAccount;
      
          return {
            accountList: newList,
            selectedAccount: newSelectedAccount
          };
        });
      },
      selectAccount(credentials) {
        set({ selectedAccount: credentials });
      },
    }),
    {
      name: "account", // localStorage 등에 저장될 key
    }
  )
);