import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { useWorkList } from '@/hooks/useWorkList'
import { WorkType } from '@renderer/store/workTypeStore'

const WorkTypeSelector = ({ onSelect }: { onSelect: (type: WorkType) => void }) => {
  const { t } = useTranslation()

  const { WORK_LIST } = useWorkList()

  return (
    <div className="flex h-[calc(100vh-120px)] items-center justify-center gap-2">
      {WORK_LIST.map((item, index) => (
        <Button
          key={index}
          title={item.description}
          variant="outline"
          className="flex h-80 w-80 cursor-pointer items-center justify-center rounded-md bg-slate-100 transition-colors duration-200 hover:bg-slate-200"
          onClick={() => onSelect(item.value as WorkType)}
        >
          <h3 className="text-2xl font-bold text-black">{t(item.title)}</h3>
        </Button>
      ))}
    </div>
  )
}

export default WorkTypeSelector
