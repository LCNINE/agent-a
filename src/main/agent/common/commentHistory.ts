import { app } from 'electron'
import { join } from 'path'
import * as fs from 'fs'

export interface CommentedPost {
  postUrl: string      // 게시물 URL 또는 고유 식별자
  author: string       // 게시물 작성자
  timestamp: number    // 댓글 작성 시각
}

export interface CommentHistory {
  commentedPosts: CommentedPost[]
  lastCleanup: number
}

const HISTORY_DIR = 'commentHistory'
const MAX_AGE_DAYS = 30  // 30일 이상 지난 기록 삭제

function getHistoryDir(): string {
  return join(app.getPath('userData'), HISTORY_DIR)
}

function getHistoryPath(username: string): string {
  return join(getHistoryDir(), `${username}.json`)
}

function ensureHistoryDir(): void {
  const dir = getHistoryDir()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function loadCommentHistory(username: string): CommentHistory {
  try {
    const filePath = getHistoryPath(username)
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      const history = JSON.parse(data) as CommentHistory
      // 로드 시 오래된 기록 정리
      cleanupOldRecords(history)
      return history
    }
  } catch (error) {
    console.error('댓글 기록 로드 실패:', error)
  }
  return { commentedPosts: [], lastCleanup: Date.now() }
}

export function saveCommentHistory(username: string, history: CommentHistory): void {
  try {
    ensureHistoryDir()
    const filePath = getHistoryPath(username)
    fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf-8')
  } catch (error) {
    console.error('댓글 기록 저장 실패:', error)
  }
}

/**
 * URL에서 게시물 고유 ID 추출
 * 인스타그램 URL 형식: https://www.instagram.com/p/{postId}/
 */
function extractPostId(postUrl: string): string {
  // /p/ 또는 /reel/ 뒤의 ID 추출
  const match = postUrl.match(/\/(p|reel)\/([^/?]+)/)
  if (match) {
    return match[2]
  }
  // URL 전체를 식별자로 사용 (fallback)
  return postUrl
}

export function hasCommentedOnPost(history: CommentHistory, postUrl: string): boolean {
  const postId = extractPostId(postUrl)
  return history.commentedPosts.some(post => extractPostId(post.postUrl) === postId)
}

export function addCommentedPost(history: CommentHistory, postUrl: string, author: string): void {
  // 중복 방지
  if (!hasCommentedOnPost(history, postUrl)) {
    history.commentedPosts.push({
      postUrl,
      author,
      timestamp: Date.now()
    })
  }
}

export function cleanupOldRecords(history: CommentHistory): void {
  const now = Date.now()
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000 // 30일을 밀리초로

  // 하루에 한 번만 정리 (성능 최적화)
  const oneDay = 24 * 60 * 60 * 1000
  if (now - history.lastCleanup < oneDay) {
    return
  }

  const originalLength = history.commentedPosts.length
  history.commentedPosts = history.commentedPosts.filter(
    post => (now - post.timestamp) < maxAge
  )
  history.lastCleanup = now

  if (originalLength !== history.commentedPosts.length) {
    console.log(`댓글 기록 정리: ${originalLength - history.commentedPosts.length}개 삭제됨`)
  }
}
