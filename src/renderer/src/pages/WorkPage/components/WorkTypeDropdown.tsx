import { useTranslation } from 'react-i18next'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useWorkList } from '@/hooks/useWorkList'
import { WorkType } from '@renderer/store/workTypeStore'
const WorkTypeDropdown = ({
  value,
  onChange
}: {
  value: WorkType
  onChange: (value: WorkType) => void
}) => {
  const { t } = useTranslation()
  const { WORK_LIST } = useWorkList()

  return (
    <Select
      value={value}
      onValueChange={(newValue) => {
        onChange(newValue as WorkType)
      }}
    >
      <SelectTrigger className="w-52">
        <SelectValue placeholder={t('workPage.title')} className="text-3xl font-bold text-black" />
      </SelectTrigger>
      <SelectContent>
        {WORK_LIST.map((item, index) => (
          <SelectItem key={index} value={item.value}>
            {t(item.title)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default WorkTypeDropdown
