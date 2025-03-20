import { useTranslation } from 'react-i18next'
import React, { useEffect } from 'react'

import { Form, FormControl, FormField, FormItem, FormLabel } from '@renderer/components/ui/form'
import { Input } from '@renderer/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { useWorkStore } from '@renderer/store/workStore'
import { HelpCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { workSchema, WorkSchema } from './schema'
import { useRouter } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { CustomToast } from '@renderer/components/CustomToast'

export function WorkCountField({ type }: { type: keyof WorkSchema }) {
  const { t } = useTranslation()
  const { workList, upsert } = useWorkStore()

  const router = useRouter()
  const navigate = useNavigate()

  const form = useForm<WorkSchema>({
    defaultValues: {
      ...workList
    },
    resolver: zodResolver(workSchema),
    mode: 'all'
  })

  useEffect(() => {
    if (form.formState.errors[type]?.count) {
      CustomToast({
        message: t('configForm.validation.workCount'),
        status: 'error',
        position: 'top-center'
      })
    }
  }, [form.formState.errors[type]?.count, t])

  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name={`${type}.count`}
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center mb-2">
                <FormLabel className="m-0 text-xs">{t('configForm.label.workCount')}</FormLabel>

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
                  className="w-20"
                  min={0}
                  aria-label="작업 횟수 설정"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
