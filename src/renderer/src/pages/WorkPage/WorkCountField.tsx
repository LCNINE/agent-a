import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { useWorkStore } from '@renderer/store/workStore'
import { HelpCircle } from 'lucide-react'
import { WorkType } from 'src'

export function WorkCountField({ type }: { type: keyof WorkType }) {
  const { t } = useTranslation()

  // 계정별 work를 직접 구독
  const workByAccount = useWorkStore((state) => state.workByAccount)
  const defaultWork = useWorkStore((state) => state.defaultWork)
  const selectedAccountForWork = useWorkStore((state) => state.selectedAccountForWork)
  const upsert = useWorkStore((state) => state.upsert)

  // 현재 계정의 workList 계산
  const workList = useMemo(() => {
    if (selectedAccountForWork && workByAccount[selectedAccountForWork]) {
      return workByAccount[selectedAccountForWork]
    }
    return defaultWork
  }, [selectedAccountForWork, workByAccount, defaultWork])

  // 현재 count 값
  const currentCount = workList[type]?.count ?? 0

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value === '' ? 0 : Number(e.target.value)

    upsert({
      [type]: {
        ...workList[type],
        count: newValue
      }
    })
  }

  return (
    <div>
      <div className="flex items-center mb-2">
        <Label className="m-0 text-xs">{t('configForm.label.workCount')}</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="w-4 h-4 ml-2 cursor-help text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('configForm.tooltip.workCount')}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <Input
        type="number"
        value={currentCount}
        onChange={handleChange}
        className="w-20"
        min={0}
        aria-label="작업 횟수 설정"
      />
    </div>
  )
}
