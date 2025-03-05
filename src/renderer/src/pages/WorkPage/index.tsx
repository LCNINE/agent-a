import Footer from '@/components/template/Footer'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import WorkTypeDropdown from './components/WorkTypeDropdown'
import WorkTypeSelector from './components/WorkTypeSelector'
import WorkManger from './components/workManager'
import useWorkTypeStore, { WorkType } from '@/store/workTypeStore'

export default function WorkPage() {
  const { t } = useTranslation()
  const { workType, changeWorkType } = useWorkTypeStore((state) => state)

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex flex-1 flex-col gap-2">
        {!workType ? (
          <WorkTypeSelector onSelect={(workType: WorkType) => changeWorkType(workType)} />
        ) : (
          <>
            <WorkTypeDropdown
              value={workType}
              onChange={(workType: WorkType) => changeWorkType(workType)}
            />
            <WorkManger type={workType} />
          </>
        )}
        <Footer />
      </div>
    </div>
  )
}
