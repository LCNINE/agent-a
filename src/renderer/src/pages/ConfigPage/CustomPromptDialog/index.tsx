'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { FormControl, FormField, FormItem, FormMessage } from '@renderer/components/ui/form'
import { AlertCircle, HelpCircle, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { ConfigSchema } from '../schema'
import { useConfigStore } from '@/store/configStore'

export default function CustomPromptDialog({
  visible,
  setVisible
}: {
  visible: boolean
  setVisible: (visible: boolean) => void
}) {
  const [activeTab, setActiveTab] = useState<'help' | 'precautions' | null>(null)
  const { setConfig } = useConfigStore()
  const form = useFormContext<ConfigSchema>()

  return (
    <Dialog open={visible} onOpenChange={() => setVisible(visible)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>대화 스타일 사용자 정의</DialogTitle>
          <DialogDescription>AI와의 대화 방식을 원하는 대로 설정하세요</DialogDescription>
        </DialogHeader>

        <div className="flex mb-6 space-x-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="relative flex items-center gap-2 bg-gray-100 border-none hover:bg-gray-200"
                onClick={() => setActiveTab('help')}
              >
                <span>도움말</span>
                <div className="relative flex items-center justify-center w-5 h-5 border border-gray-400 border-dashed rounded-full">
                  <span className="text-xs">?</span>
                  <span className="absolute w-2 h-2 bg-blue-500 rounded-full -right-1 -top-1 animate-ping"></span>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg max-h-[80vh] overflow-y-auto sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-500" />
                  <span>도움말</span>
                </DialogTitle>
                <DialogDescription>AI와의 대화 스타일 사용자 정의에 대한 도움말</DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="p-4 border border-blue-100 rounded-lg bg-blue-50">
                  <h3 className="flex items-center gap-2 mb-2 font-medium text-blue-800">
                    <Info className="w-4 h-4" />
                    프롬프트 작성 방법
                  </h3>
                  <ul className="pl-5 space-y-2 text-sm tracking-wide text-blue-700 list-disc">
                    <li>
                      AI의 역할을 명확하게 정의하세요
                      <br />
                      (예: "너는 친절한 요리 전문가야")
                    </li>
                    <li>
                      원하는 응답 형식을 지정하세요
                      <br /> (예: "단계별로 설명해줘")
                    </li>
                    <li>
                      구체적인 지시사항을 포함하세요
                      <br /> (예: "전문 용어는 피하고 쉽게 설명해줘")
                    </li>
                  </ul>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h3 className="mb-2 font-medium">예시 프롬프트</h3>
                  <div className="p-3 text-sm text-gray-700 bg-white border border-gray-200 rounded">
                    당신은 반영구 눈썹 아이라인 입술 미인점 smp 두피문신 속눈썹 펌을하는 디자이너고,
                    사당 이수에서 반영구 샵 오픈예정인 원장입니다.
                    <br />
                    또한 나랑 같은 직종에 일하는듯한 게시글에는 댓글을 달지말고 거부해주세요.
                    <br /> 이거를 명심하고 댓글 달 때 유의해서 달아주세요!
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="relative flex items-center gap-2 bg-gray-100 border-none hover:bg-gray-200"
                onClick={() => setActiveTab('precautions')}
              >
                <span>유의 사항</span>
                <div className="relative flex items-center justify-center w-5 h-5 border border-gray-400 border-dashed rounded-full">
                  <span className="text-xs">!</span>
                  <span className="absolute w-2 h-2 rounded-full -right-1 -top-1 animate-ping bg-amber-500"></span>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <span>유의 사항</span>
                </DialogTitle>
                <DialogDescription>
                  AI 대화 스타일 사용자 정의 시 주의해야 할 사항
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="p-4 border rounded-lg border-amber-100 bg-amber-50">
                  <h3 className="flex items-center gap-2 mb-2 font-medium text-amber-800">
                    <AlertCircle className="w-4 h-4" />
                    주의사항
                  </h3>
                  <ul className="pl-5 space-y-2 text-sm list-disc text-amber-700">
                    <li>개인정보(주민등록번호, 전화번호 등)를 입력하지 마세요</li>
                    <li>불법적인 활동을 요청하는 프롬프트는 사용할 수 없습니다</li>
                    <li>
                      AI의 응답은 항상 정확하지 않을 수 있으며, 중요한 결정에는 전문가의 조언을
                      구하세요
                    </li>
                    <li>프롬프트는 서비스 개선을 위해 저장될 수 있습니다</li>
                  </ul>
                </div>

                <div className="p-4 border border-red-100 rounded-lg bg-red-50">
                  <h3 className="flex items-center gap-2 mb-2 font-medium text-red-800">
                    <AlertCircle className="w-4 h-4" />
                    금지된 사용 사례
                  </h3>
                  <ul className="pl-5 space-y-1 text-sm text-red-700 list-disc">
                    <li>타인을 사칭하거나 기만하는 목적의 사용</li>
                    <li>혐오 발언이나 차별적 내용을 포함하는 프롬프트</li>
                    <li>저작권이나 지적재산권을 침해하는 콘텐츠 생성</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6">
          <p className="mb-2 text-sm text-gray-500">대화스타일 입력</p>

          <FormField
            control={form.control}
            name="prompt.custom"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="예시: 당신은 반영구 눈썹 아이라인 입술 미인점 smp 두피문신 속눈썹 펌을하는 디자이너이고, 사람 이수에게 방문한 상담예정인 원장이다. 또한 나랑 같은 직종에 일하는듯한 게시글에는 댓글을 달지말고 거부해주세요. 이것을 명심하고 답변해줘."
                    className="min-h-[120px] resize-none"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end mt-4">
            <Button
              type="button"
              variant="outline"
              className="mr-2"
              onClick={async () => {
                setVisible(false)

                const isValid = await form.trigger('prompt.custom')

                if (!isValid) {
                  form.reset()
                  return
                }
              }}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="text-white bg-gray-900 hover:bg-gray-800"
              onClick={() => {
                const customValue =
                  form.getValues().prompt.preset === 'custom'
                    ? (form.getValues().prompt as { preset: 'custom'; custom: string }).custom
                    : undefined

                if (
                  form.getValues().prompt.preset === 'custom' &&
                  (!customValue || customValue.trim() === '')
                ) {
                  form.setError('prompt.custom', {
                    type: 'manual',
                    message: '대화 스타일을 입력해주세요'
                  })
                  return
                }

                setConfig({
                  prompt: {
                    preset: 'custom',
                    custom: customValue as string
                  }
                })
                setVisible(false)
              }}
            >
              변경사항 저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
