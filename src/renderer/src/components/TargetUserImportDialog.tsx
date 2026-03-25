import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Label } from '@renderer/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { TargetUser } from 'src'

interface TargetUserImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (users: TargetUser[]) => void
}

export default function TargetUserImportDialog({
  open,
  onOpenChange,
  onImport
}: TargetUserImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [previewData, setPreviewData] = useState<string[]>([])
  const [allData, setAllData] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.xlsx')) {
      setError('xlsx 파일만 지원됩니다.')
      return
    }

    setError(null)
    setFile(selectedFile)

    try {
      const arrayBuffer = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 })

      if (jsonData.length === 0) {
        setError('파일에 데이터가 없습니다.')
        return
      }

      // 첫 번째 행을 헤더로 사용
      const firstRow = jsonData[0] as unknown[]
      const headers = firstRow.map((h, i) => (h != null ? String(h) : `Column ${i + 1}`))
      setColumns(headers)
      setSelectedColumn(headers[0] || '')

      // 데이터 추출
      const dataRows = jsonData.slice(1) as unknown[][]
      const firstColData = dataRows
        .map(row => (row[0] != null ? String(row[0]).trim() : ''))
        .filter(val => val.length > 0)

      setAllData(firstColData)
      setPreviewData(firstColData.slice(0, 10))
    } catch (err) {
      setError('파일을 읽는 중 오류가 발생했습니다.')
      console.error(err)
    }
  }

  const handleColumnChange = (columnName: string) => {
    setSelectedColumn(columnName)

    if (file) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer
          const workbook = XLSX.read(arrayBuffer, { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 })

          const firstRow = jsonData[0] as unknown[]
          const headers = firstRow.map((h) => (h != null ? String(h) : ''))
          const columnIndex = headers.findIndex(h => h === columnName)

          if (columnIndex === -1) return

          const dataRows = jsonData.slice(1) as unknown[][]
          const colData = dataRows
            .map(row => (row[columnIndex] != null ? String(row[columnIndex]).trim() : ''))
            .filter(val => val.length > 0)

          setAllData(colData)
          setPreviewData(colData.slice(0, 10))
        } catch (err) {
          console.error(err)
        }
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const handleImport = () => {
    const users: TargetUser[] = allData.map(username => ({
      username: username.replace('@', '').trim(),
      status: 'pending' as const
    }))

    onImport(users)
    resetState()
    onOpenChange(false)
  }

  const resetState = () => {
    setFile(null)
    setColumns([])
    setSelectedColumn('')
    setPreviewData([])
    setAllData([])
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      resetState()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            엑셀 파일에서 유저 불러오기
          </DialogTitle>
          <DialogDescription>
            xlsx 파일에서 인스타그램 username 목록을 불러옵니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>파일 선택</Label>
            <div
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {file ? file.name : '클릭하여 xlsx 파일 선택'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {columns.length > 0 && (
            <div className="space-y-2">
              <Label>Username 열 선택</Label>
              <Select value={selectedColumn} onValueChange={handleColumnChange}>
                <SelectTrigger>
                  <SelectValue placeholder="열 선택" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col, i) => (
                    <SelectItem key={i} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {previewData.length > 0 && (
            <div className="space-y-2">
              <Label>미리보기 ({allData.length}명)</Label>
              <ScrollArea className="h-[150px] rounded-xl bg-muted/50 p-3">
                <div className="space-y-1">
                  {previewData.map((username, i) => (
                    <div
                      key={i}
                      className="text-sm py-1 px-2 rounded bg-background/50"
                    >
                      @{username.replace('@', '')}
                    </div>
                  ))}
                  {allData.length > 10 && (
                    <div className="text-sm text-muted-foreground py-1 px-2">
                      ... 외 {allData.length - 10}명
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleClose(false)}>
            취소
          </Button>
          <Button
            onClick={handleImport}
            disabled={allData.length === 0}
          >
            {allData.length}명 불러오기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
