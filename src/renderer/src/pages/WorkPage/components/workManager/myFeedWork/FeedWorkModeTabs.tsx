import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import useMyFeedWorkStore from '@renderer/store/myFeedWorkStore'
import { toast } from 'sonner'
import AdvancedModeSettings from './AdvancedModeSettings'
import BasicModeSettings from './BasicModeSettings'

const FeedWorkModeTabs = () => {
  const { changeFeedWorkMode } = useMyFeedWorkStore()

  const handleModeChange = (value: string) => {
    if (value === 'advanced') {
      toast.error('준비중입니다.')
      return
    }
    changeFeedWorkMode(value as 'basic' | 'advanced')
  }

  return (
    <Tabs defaultValue="basic" className="w-full" onValueChange={handleModeChange}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="basic">기본 모드</TabsTrigger>
        <TabsTrigger value="advanced">고급 모드</TabsTrigger>
      </TabsList>
      <TabsContent value="basic">
        <BasicModeSettings />
      </TabsContent>

      <TabsContent value="advanced">
        <AdvancedModeSettings />
      </TabsContent>
    </Tabs>
  )
}

export default FeedWorkModeTabs
