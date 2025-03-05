import { useTranslation } from 'react-i18next'

export const useWorkList = () => {
  const { t } = useTranslation()

  const WORK_LIST = [
    {
      title: t('workPage.workList.item1.title'),
      description: t('workPage.workList.item1.description'),
      value: 'hashtag_and_feed'
    }
  ]

  return { WORK_LIST }
}
