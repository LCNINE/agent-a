import { app } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import * as fs from 'fs'
import { SupabaseClient } from '@supabase/supabase-js'

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

/**
 * 댓글 기록 저장 경로
 * 앱 재설치와 무관하게 유지되도록 사용자 홈 디렉토리의 .agent-a 폴더 사용
 * - Windows: C:\Users\{user}\.agent-a\commentHistory\
 * - macOS: /Users/{user}/.agent-a/commentHistory/
 */
function getHistoryDir(): string {
  return join(homedir(), '.agent-a', HISTORY_DIR)
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

/**
 * 기존 경로(app.getPath('userData'))에서 새 경로(homedir/.agent-a)로 마이그레이션
 */
function migrateFromOldPath(username: string): void {
  try {
    const oldPath = join(app.getPath('userData'), HISTORY_DIR, `${username}.json`)
    const newPath = getHistoryPath(username)

    // 기존 파일이 있고, 새 파일이 없으면 마이그레이션
    if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
      ensureHistoryDir()
      const data = fs.readFileSync(oldPath, 'utf-8')
      fs.writeFileSync(newPath, data, 'utf-8')
      console.log(`댓글 기록 마이그레이션 완료: ${oldPath} -> ${newPath}`)

      // 마이그레이션 후 기존 파일 삭제 (선택적)
      // fs.unlinkSync(oldPath)
    }
  } catch (error) {
    console.error('댓글 기록 마이그레이션 실패:', error)
  }
}

export function loadCommentHistory(username: string): CommentHistory {
  try {
    // 기존 경로에서 마이그레이션 시도
    migrateFromOldPath(username)

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
export function extractPostId(postUrl: string): string {
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

// ============================================
// Supabase 기반 댓글 기록 함수
// ============================================

/**
 * Supabase에서 댓글 기록 체크
 * @returns 이미 댓글을 작성했으면 true, 아니면 false
 */
export async function hasCommentedOnPostSupabase(
  supabase: SupabaseClient,
  instagramUsername: string,
  postUrl: string
): Promise<boolean> {
  const postId = extractPostId(postUrl)

  try {
    const { data, error } = await supabase
      .from('comment_history')
      .select('id')
      .eq('instagram_username', instagramUsername)
      .eq('post_id', postId)
      .maybeSingle()

    if (error) {
      console.error('Supabase 댓글 기록 체크 실패:', error)
      return false // 에러 시 false 반환 (댓글 허용)
    }

    return data !== null
  } catch (error) {
    console.error('Supabase 댓글 기록 체크 중 예외:', error)
    return false
  }
}

/**
 * Supabase에 댓글 기록 저장
 * @returns 저장 성공 여부
 */
export async function saveCommentToSupabase(
  supabase: SupabaseClient,
  instagramUsername: string,
  postUrl: string,
  postAuthor?: string
): Promise<boolean> {
  const postId = extractPostId(postUrl)

  try {
    const { error } = await supabase
      .from('comment_history')
      .upsert(
        {
          instagram_username: instagramUsername,
          post_id: postId,
          post_author: postAuthor || null
        },
        {
          onConflict: 'instagram_username,post_id',
          ignoreDuplicates: true
        }
      )

    if (error) {
      // 23505 = unique violation (이미 존재하는 경우)
      if (error.code === '23505') {
        console.log('Supabase 댓글 기록: 이미 존재함')
        return true
      }
      console.error('Supabase 댓글 기록 저장 실패:', error)
      return false
    }

    console.log(`Supabase 댓글 기록 저장: ${instagramUsername} -> ${postId}`)
    return true
  } catch (error) {
    console.error('Supabase 댓글 기록 저장 중 예외:', error)
    return false
  }
}
