import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { EditAccountDialog } from './EditAccountDialog'
import { useAccountStore } from '@/store/accountStore'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Circle, Edit2, Key, Lock, Trash2 } from 'lucide-react'
import { cn } from '@/utils/tailwind'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface AccountTableProps {
  accounts: { username: string; password: string }[]
}

export function AccountTable({ accounts }: AccountTableProps) {
  const { t } = useTranslation()
  const { deleteAccount, selectAccount, selectedAccount } = useAccountStore()

  const handleAccountSelect = (username: string) => {
    const account = accounts.find((acc) => acc.username === username)
    if (account && account.password) {
      selectAccount(account)
      toast.success(`${account.username} ${t('accountTable.accountSelected')}`)
    }
  }

  const handleDeleteAccount = (username: string) => {
    deleteAccount(username)
    toast.success(t('accountTable.accountDeleted'))
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[40px]"></TableHead>
            <TableHead className="w-[120px] md:w-[200px]">username</TableHead>
            <TableHead>password</TableHead>
            <TableHead className="w-[180px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow
              key={account.username}
              className={cn(
                'group cursor-pointer transition-colors hover:bg-muted/50',
                selectedAccount?.username === account.username && 'bg-muted/30'
              )}
              onClick={() => handleAccountSelect(account.username)}
            >
              <TableCell className="px-2">
                <div className="flex items-center justify-center">
                  {selectedAccount?.username === account.username ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate">{account.username}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="font-mono">••••••••</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <EditAccountDialog
                    account={account}
                    trigger={
                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                        <Edit2 className="h-4 w-4" />
                        <span className="ml-2 hidden sm:inline">{t('accountTable.edit')}</span>
                      </Button>
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="ml-2 hidden text-destructive sm:inline">
                          {t('accountTable.delete')}
                        </span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('accountTable.deleteConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('accountTable.deleteConfirmDescription', {
                            username: account.username
                          })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('accountTable.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteAccount(account.username)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('accountTable.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
