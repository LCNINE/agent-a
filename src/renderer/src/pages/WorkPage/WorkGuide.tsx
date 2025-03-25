import { ChevronRight } from 'lucide-react'

export default function WorkGuide() {
  return (
    <div className="p-4 rounded-lg bg-gray-50">
      <h3 className="mb-3 text-sm font-medium">작업 프로세스 흐름</h3>
      <div className="flex items-center justify-between text-sm">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-16 h-16 mb-2 bg-blue-100 rounded-lg">
            <span className="font-medium text-blue-600">1</span>
          </div>
          <span className="text-center">해시태그 검색</span>
        </div>
        <div className="flex items-center self-start mt-8">
          <ChevronRight className="text-gray-400" size={20} />
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-16 h-16 mb-2 bg-indigo-100 rounded-lg">
            <span className="font-medium text-indigo-600">2</span>
          </div>
          <span className="text-center">피드 선택</span>
        </div>
        <div className="flex items-center self-start mt-8">
          <ChevronRight className="text-gray-400" size={20} />
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-16 h-16 mb-2 bg-purple-100 rounded-lg">
            <span className="font-medium text-purple-600">3</span>
          </div>
          <span className="text-center">댓글 작성자</span>
        </div>
        <div className="flex items-center self-start mt-8">
          <ChevronRight className="text-gray-400" size={20} />
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-16 h-16 mb-2 bg-pink-100 rounded-lg">
            <span className="font-medium text-pink-600">4</span>
          </div>
          <span className="text-center">좋아요/댓글</span>
        </div>
      </div>
      <div className="mt-3 text-xs italic text-gray-500">
        각 해시태그마다 위 프로세스가 순차적으로 실행됩니다
      </div>
    </div>
  )
}
