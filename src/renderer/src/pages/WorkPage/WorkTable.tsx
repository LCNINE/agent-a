import React from "react"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTranslation } from "react-i18next"
import { useWorkStore, Work } from "@/store/workStore"
import { Button } from "@/components/ui/button"
import { ChevronDownIcon, ChevronUpIcon, SquarePenIcon, TrashIcon } from "lucide-react"
import { WorkFormDialog } from "./WorkFormDialog"


export function WorkTable() {
  const { workList, up, down, remove } = useWorkStore()

  const { t } = useTranslation()

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>종류</TableHead>
          <TableHead>상세</TableHead>
          <TableHead className="w-[100px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {
          workList.map((work) => (
            <TableRow key={work.id}>
              <TableCell>{t(`work.type.${work.type}`)}</TableCell>
              <TableCell>{work.type === "hashtag" ? "#" + work.tag : ""}</TableCell>
              <TableCell>
                <div className="flex flex-row gap-2 flex-nowrap">
                  <Button onClick={() => up(work.id)} variant="ghost" size="icon" className="w-6 h-6">
                    <ChevronUpIcon className="w-4 h-4"/>
                  </Button>
                  <Button onClick={() => down(work.id)} variant="ghost" size="icon" className="w-6 h-6">
                    <ChevronDownIcon className="w-4 h-4"/>
                  </Button>
                  <WorkFormDialog
                    work={work}
                    trigger={
                      <Button variant="ghost" size="icon" className="w-6 h-6">
                        <SquarePenIcon className="w-4 h-4"/>
                      </Button>
                    }
                  />
                  <Button onClick={() => remove(work.id)} variant="ghost" size="icon" className="w-6 h-6">
                    <TrashIcon className="w-4 h-4"/>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        }
      </TableBody>
    </Table>
  )
}