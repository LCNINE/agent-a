import React from 'react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useTranslation } from 'react-i18next'
import { useWorkStore, Work } from '@/store/workStore'
import { Button } from '@/components/ui/button'
import { ChevronDownIcon, ChevronUpIcon, SquarePenIcon, TrashIcon } from 'lucide-react'
import { WorkFormDialog } from './WorkFormDialog'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogTrigger
} from '@renderer/components/ui/alert-dialog'

export function WorkTable() {
  const { workList, up, down, remove, allRemove } = useWorkStore()
  const { t } = useTranslation()

  return (
    <div className="w-full">
      <ScrollArea className="h-[calc(100vh-150px)]">
        <Table>
          <TableHeader className="relative">
            <TableRow>
              <TableHead>종류</TableHead>
              <TableHead>상세</TableHead>

              <TableHead className="w-[100px]"></TableHead>

              <TableHead className="absolute bottom-2 right-2 h-6 w-6 rounded-xl">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      title="전체 삭제"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-xl"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>모든 작업을 삭제하시겠습니까?</AlertDialogTitle>
                      <AlertDialogDescription>
                        한번 삭제하면 복구 할 수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction onClick={allRemove}>삭제</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workList.map((work) => (
              <TableRow key={work.id}>
                <TableCell>{t(`work.type.${work.type}`)}</TableCell>
                <TableCell>{work.type === 'hashtag' ? '#' + work.tag : ''}</TableCell>
                <TableCell>
                  <div className="flex flex-row flex-nowrap gap-2">
                    <Button
                      onClick={() => up(work.id)}
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                    >
                      <ChevronUpIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => down(work.id)}
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                    >
                      <ChevronDownIcon className="h-4 w-4" />
                    </Button>
                    <WorkFormDialog
                      work={work}
                      trigger={
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <SquarePenIcon className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <Button
                      onClick={() => remove(work.id)}
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}
