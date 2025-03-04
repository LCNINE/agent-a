import HashTagAndFeedWork from './hashTagAndFeedWork'
import MyFeedWork from './myFeedWork'
import { WorkType } from '@renderer/store/workTypeStore'

const WorkManger = ({ type }: { type: WorkType }) => {
  if (type === 'hashtag_and_feed') {
    return <HashTagAndFeedWork />
  }
  if (type === 'my_feed') {
    return <MyFeedWork />
  }
  return null
}

export default WorkManger
