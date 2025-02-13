import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { UpdatePasswordDialog } from './UpdatePasswordDialog'
import { useAccountStore } from '@/store/accountStore'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Circle, Key, Lock, Unlock } from 'lucide-react'
import { cn } from '@/utils/tailwind'

interface AccountTableProps {
  accounts: { username: string; password: string }[]
}

export function AccountTable({ accounts }: AccountTableProps) {
  const { t } = useTranslation()
  const { updatePassword, selectAccount, selectedAccount } = useAccountStore()
  const [tempPasswords, setTempPasswords] = useState<{ [key: string]: string }>({})

  const handlePasswordSubmit = (username: string, password: string) => {
    updatePassword({ username, password })
    setTempPasswords((prev) => ({ ...prev, [username]: '' }))
  }

  const handleAccountSelect = (username: string) => {
    console.log('handleAccountSelectBtn Clicked Event username:', username)
    const account = accounts.find((acc) => acc.username === username)
    console.log('handleAccountSelectBtn Clicked Event account:', account)
    if (account && account.password) {
      selectAccount(account)
    }
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[40px]"></TableHead>
            <TableHead className="w-[120px] md:w-[200px]">username</TableHead>
            <TableHead>password</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow
              key={account.username}
              className={cn(
                'transition-colors hover:bg-muted/50 cursor-pointer group',
                selectedAccount?.username === account.username && 'bg-muted/30'
              )}
              onClick={() => account.password && handleAccountSelect(account.username)}
            >
              <TableCell className="px-2">
                <div className="flex items-center justify-center">
                  {account.password ? (
                    selectedAccount?.username === account.username ? (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground/50" />
                  )}
                </div>
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{account.username}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-between gap-2">
                  {account.password ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-mono">••••••••</span>
                      </div>
                      <UpdatePasswordDialog
                        username={account.username}
                        trigger={
                          <Button variant="ghost" size="sm" className="ml-auto">
                            <Key className="w-4 h-4" />
                            <span className="hidden sm:inline ml-2">
                              {t('accountTable.changePassword')}
                            </span>
                          </Button>
                        }
                      />
                    </>
                  ) : (
                    <form
                      className="flex items-center justify-between gap-2 w-full"
                      onSubmit={(e) => {
                        e.preventDefault()
                        handlePasswordSubmit(
                          account.username,
                          tempPasswords[account.username] || ''
                        )
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Unlock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <Input
                          type="password"
                          value={tempPasswords[account.username] || ''}
                          onChange={(e) =>
                            setTempPasswords((prev) => ({
                              ...prev,
                              [account.username]: e.target.value
                            }))
                          }
                          placeholder={t('accountTable.enterPassword')}
                          className="max-w-[200px]"
                        />
                      </div>
                      <Button type="submit" size="sm" variant="outline">
                        <Key className="w-4 h-4" />
                        <span className="hidden sm:inline ml-2">
                          {t('accountTable.passwordSave')}
                        </span>
                      </Button>
                    </form>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
