import HashTagAndFeedWork from './hashTagAndFeedWork'
import MyFeedWork from './myFeedWork'
import { WorkType } from '@renderer/store/workTypeStore'

const WorkManger = ({ type }: { type: WorkType }) => {
  return (
    <>
      {type === 'hashtag_and_feed' && <HashTagAndFeedWork />}
      {type === 'my_feed' && <MyFeedWork />}
    </>
  )
}

export default WorkManger
