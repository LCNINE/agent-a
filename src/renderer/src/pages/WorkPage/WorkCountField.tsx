import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { CustomToast } from '@renderer/components/CustomToast'
import { FormControl, FormField, FormItem, FormLabel } from '@renderer/components/ui/form'
import { Input } from '@renderer/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { useErrorStore } from '@renderer/store/errorStore'
import { useWorkStore } from '@renderer/store/workStore'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { HelpCircle } from 'lucide-react'
import { useFormContext } from 'react-hook-form'
import { WorkSchema } from './schema'

export function WorkCountField({ type, label }: { type: keyof WorkSchema; label: string }) {
  const { t } = useTranslation()
  const { workList, upsert } = useWorkStore()
  const { hasError, errorTypes, removeError, addError, clearAllErrors } = useErrorStore()

  const router = useRouter()
  const navigate = useNavigate()

  const form = useFormContext<WorkSchema>()

  useEffect(() => {
    if (form.formState.errors[type]?.count) {
      CustomToast({
        message: t('configForm.validation.workCount'),
        status: 'error',
        position: 'top-center'
      })
    }
  }, [form.formState.errors[type]?.count, t])

  useEffect(() => {
    form.trigger()
  }, [])

  return (
    <FormField
      control={form.control}
      name={`${type}.count`}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center mb-2">
            <FormLabel className={`m-0 text-xs`}>{label}</FormLabel>

            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 ml-2 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('configForm.tooltip.workCount')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <FormControl>
            <Input
              type="number"
              {...field}
              onChange={(e) => {
                const newValue = e.target.value === '' ? null : Number(e.target.value)
                field.onChange(newValue)

                upsert({
                  ...workList,
                  [type]: {
                    ...workList[type],
                    count: newValue
                  }
                })
              }}
              className={`w-20`}
              min={0}
              aria-label="작업 횟수 설정"
            />
          </FormControl>
        </FormItem>
      )}
    />
  )
}
