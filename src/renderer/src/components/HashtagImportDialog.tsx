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
import { Upload, FileSpreadsheet, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react'

interface HashtagImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (hashtags: string[]) => void
}

const normalizeHashtag = (raw: string): string => {
  return raw
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, '')
}

const extractColumn = (jsonData: unknown[][], columnIndex: number): string[] => {
  const dataRows = jsonData.slice(1) as unknown[][]
  const seen = new Set<string>()
  const result: string[] = []
  for (const row of dataRows) {
    const cell = row[columnIndex]
    if (cell == null) continue
    const normalized = normalizeHashtag(String(cell))
    if (!normalized) continue
    if (seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

export default function HashtagImportDialog({
  open,
  onOpenChange,
  onImport
}: HashtagImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [previewData, setPreviewData] = useState<string[]>([])
  const [allData, setAllData] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isGuideOpen, setIsGuideOpen] = useState(true)
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

      const firstRow = jsonData[0] as unknown[]
      const headers = firstRow.map((h, i) => (h != null ? String(h) : `Column ${i + 1}`))
      setColumns(headers)
      setSelectedColumn(headers[0] || '')

      const firstColData = extractColumn(jsonData as unknown[][], 0)
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
          const columnIndex = headers.findIndex((h) => h === columnName)

          if (columnIndex === -1) return

          const colData = extractColumn(jsonData as unknown[][], columnIndex)
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
    onImport(allData)
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

  const handleClose = (next: boolean) => {
    if (!next) {
      resetState()
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            엑셀 파일에서 해시태그 불러오기
          </DialogTitle>
          <DialogDescription>
            xlsx 파일에서 해시태그 목록을 한 번에 등록합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <div className="rounded-xl border border-apple-blue/30 bg-apple-blue/5">
            <button
              type="button"
              onClick={() => setIsGuideOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4 text-apple-blue" />
                엑셀 파일은 어떻게 만드나요?
              </span>
              {isGuideOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {isGuideOpen && (
              <div className="space-y-2 px-3 pb-3 text-xs text-muted-foreground">
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    확장자: <span className="font-semibold text-foreground">.xlsx</span> 파일만 지원합니다.
                  </li>
                  <li>
                    첫 번째 행은 <span className="font-semibold text-foreground">헤더(열 이름)</span> 입니다.
                    <br />예: <code className="rounded bg-muted px-1">hashtag</code> /{' '}
                    <code className="rounded bg-muted px-1">해시태그</code> 등 원하는 이름 가능.
                  </li>
                  <li>해시태그는 한 열에 세로로 한 줄씩 입력하세요.</li>
                  <li>
                    맨 앞의 <code className="rounded bg-muted px-1">#</code>은 자동으로 제거됩니다.{' '}
                    (<code>#고양이</code> → <code>고양이</code>)
                  </li>
                  <li>
                    셀 안의 공백도 자동으로 제거됩니다. (<code>토끼 귀엽</code> → <code>토끼귀엽</code>)
                  </li>
                  <li>빈 셀과 중복 항목은 자동으로 제외됩니다.</li>
                </ul>

                <div className="space-y-1 pt-1">
                  <div className="text-[11px] font-semibold text-foreground">예시</div>
                  <pre className="rounded-md bg-muted px-2 py-1.5 text-[11px] leading-relaxed">
{`| hashtag |
|---------|
| 고양이  |
| 강아지  |
| 토끼    |`}
                  </pre>
                  <p className="text-[11px]">
                    여러 열이 있어도 괜찮아요. 업로드 후 실제 해시태그 값이 들어있는 열만 선택하면 됩니다.
                  </p>
                </div>
              </div>
            )}
          </div>

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
              <Label>어느 열을 읽어올까요?</Label>
              <Select value={selectedColumn} onValueChange={handleColumnChange}>
                <SelectTrigger>
                  <SelectValue placeholder="해시태그 값이 있는 열 선택" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col, i) => (
                    <SelectItem key={i} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                엑셀에 여러 열이 있을 때{' '}
                <span className="font-semibold text-foreground">실제 해시태그 값이 들어있는 열</span>을 지정해주세요.
                아래 미리보기로 값이 맞는지 확인할 수 있어요.
              </p>
            </div>
          )}

          {previewData.length > 0 && (
            <div className="space-y-2">
              <Label>미리보기 ({allData.length}개)</Label>
              <ScrollArea className="h-[150px] rounded-xl bg-muted/50 p-3">
                <div className="space-y-1">
                  {previewData.map((tag, i) => (
                    <div
                      key={i}
                      className="text-sm py-1 px-2 rounded bg-background/50"
                    >
                      #{tag}
                    </div>
                  ))}
                  {allData.length > 10 && (
                    <div className="text-sm text-muted-foreground py-1 px-2">
                      ... 외 {allData.length - 10}개
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => handleClose(false)}>
            취소
          </Button>
          <Button
            onClick={handleImport}
            disabled={allData.length === 0}
          >
            {allData.length}개 불러오기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
