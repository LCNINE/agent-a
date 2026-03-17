import React, { useEffect } from 'react'
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
import { Switch } from '@/components/ui/switch'
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
  maxInstances: number
}

export function AccountTable({ accounts, maxInstances }: AccountTableProps) {
  const { t } = useTranslation()
  const { deleteAccount, selectAccount, selectedAccount, activeAccounts, toggleAccountActive } =
    useAccountStore()

  const handleToggleActive = (e: React.MouseEvent, username: string) => {
    e.stopPropagation()
    const success = toggleAccountActive(username, maxInstances)
    if (!success) {
      toast.error(`현재 플랜은 최대 ${maxInstances}개까지 활성화할 수 있습니다.`)
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
            <TableHead className="w-[60px] text-center">활성화</TableHead>
            <TableHead className="w-[120px] md:w-[200px]">username</TableHead>
            <TableHead>password</TableHead>
            <TableHead className="w-[180px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow
              key={account.username}
              className="group transition-colors hover:bg-muted/50"
            >
              <TableCell className="px-2">
                <div
                  className="flex items-center justify-center"
                  onClick={(e) => handleToggleActive(e, account.username)}
                >
                  <Switch
                    checked={activeAccounts.includes(account.username)}
                    onCheckedChange={() => {}}
                  />
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
                <div
                  className="flex items-center justify-end gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <EditAccountDialog
                    account={account}
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      >
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
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                          {t('accountTable.cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteAccount(account.username)
                          }}
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
