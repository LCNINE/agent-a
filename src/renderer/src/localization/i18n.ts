import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

i18n.use(initReactI18next).init({
  fallbackLng: 'en',
  resources: {
    en: {
      translation: {
        appName: 'AI Instagram Manager',
        loginForm: {
          title: 'Login',
          email: {
            label: 'Email'
          },
          password: {
            label: 'Password',
            forgot: 'Forgot password?'
          },
          submit: 'Login',
          noAccount: "Don't have an account?",
          applyForAccount: 'Apply for one'
        },
        nav: {
          homePage: 'Home',
          workPage: 'Work',
          configPage: 'Config'
        },
        homePage: {},
        AgentController: {
          status: {
            idle: 'Not currently working',
            working: 'Working in progress'
          },
          action: {
            start: 'Start',
            stop: 'Stop'
          }
        },
        workPage: {
          title: 'Work Management'
        },
        work: {
          type: {
            feed: 'Feed',
            hashtag: 'Hashtag'
          }
        },
        workForm: {
          trigger: {
            create: 'Add Work',
            update: 'Update Work'
          },
          title: {
            create: 'Add Work',
            update: 'Update Work'
          },
          submit: {
            create: 'Add',
            update: 'Update'
          },
          type: {
            label: 'Type',
            select: {
              feed: 'Feed',
              hashtag: 'Hashtag'
            }
          },
          tag: {
            label: 'Tag'
          }
        },
        configPage: {
          title: 'Config'
        },
        configForm: {
          toast: {
            submitSuccess: 'Configuration saved successfully!'
          },
          validation: {
            preset: 'Choose one of the conversational styles',
            commentLength: {
              max: 'Comments must be a maximum of 40 characters',
              min: 'Comments must be at least 20 characters long'
            }
          },
          label: {
            prompt: 'Prompt Preset',
            commentLength: {
              min: 'Minimum Comment Length',
              max: 'Maximum Comment Length'
            },
            postIntervalSeconds: 'Post Interval (Seconds)',
            workIntervalSeconds: 'Work Interval (Seconds)',
            loopIntervalSeconds: 'Loop Interval (Seconds)'
          },
          description: {
            postIntervalSeconds: 'Time interval between posting comments on each post',
            workIntervalSeconds: 'Time interval between each task in the task list',
            loopIntervalSeconds:
              'Time interval after all tasks in the task list are completed before restarting from the first task'
          },
          field: {
            prompt: {
              formal: 'Formal',
              casual: 'Casual',
              hyper: 'Hyper',
              custom: 'Custom'
            }
          },
          submit: 'Save'
        },
        userMenu: {
          manageAccount: 'Managing Instagram accounts',
          logout: 'Logout'
        },
        accountTable: {
          // "changePassword": "Change Password",
          // "enterPassword": "Enter Password",
          // "passwordUpdated": "Password has been updated",
          // "passwordSave": "Save",
          // "editAccount": "Edit Account",
          title: 'Instagram Account Management',
          edit: 'edit',
          save: 'save',
          add: 'add',
          delete: 'delete',
          cancel: 'cancel',
          addAccount: 'Add Account',
          deleteConfirmTitle: 'Delete Account',
          deleteConfirmDescription: "Are you sure you want to delete account '{{username}}'?",
          accountAdded: 'Account has been added',
          accountUpdated: 'Account has been updated',
          accountDeleted: 'Account has been deleted',
          requiredFields: 'Please fill in all fields',
          usernameExists: 'Username already exists',
          addError: 'An error occurred while adding the account'
        },
        subscription: {
          inactive: 'Subscription is inactive. Start your subscription to use the service.'
        }
      }
    },
    'ko-KR': {
      translation: {
        appName: 'AI 인스타그램 매니저',
        loginForm: {
          title: '로그인',
          email: {
            label: '이메일'
          },
          password: {
            label: '비밀번호',
            forgot: '비밀번호 찾기'
          },
          submit: '로그인',
          success: '로그인되었습니다',
          error: '로그인에 실패했습니다',
          noAccount: '계정이 없으신가요?',
          applyForAccount: '신청하기'
        },
        nav: {
          homePage: '홈',
          workPage: '작업',
          configPage: '설정'
        },
        homePage: {},
        AgentController: {
          status: {
            idle: '작업 중이 아닙니다.',
            working: '작업중입니다.'
          },
          action: {
            start: '시작',
            stop: '정지'
          }
        },
        workPage: {
          title: '작업 관리'
        },
        work: {
          type: {
            feed: '피드',
            hashtag: '해시태그'
          }
        },
        workForm: {
          trigger: {
            create: '작업 추가',
            update: '작업 수정'
          },
          title: {
            create: '작업 추가',
            update: '작업 수정'
          },
          submit: {
            create: '추가',
            update: '수정'
          },
          type: {
            label: '종류',
            select: {
              feed: '피드',
              hashtag: '해시태그'
            }
          },
          tag: {
            label: '태그'
          }
        },
        configPage: {
          title: '설정'
        },
        configForm: {
          toast: {
            submitSuccess: '설정이 저장되었습니다!'
          },

          validation: {
            preset: '대화체 하나를 선택해주세요',
            commentLength: {
              max: '댓글은 최대 40자 이하여야 합니다',
              min: '댓글은 최소 20자 이상이어야 합니다'
            }
          },
          label: {
            prompt: '프롬프트 프리셋',
            commentLength: {
              min: '최소 댓글 길이',
              max: '최대 댓글 길이'
            },
            postIntervalSeconds: '댓글 시간 간격 (초)',
            workIntervalSeconds: '작업 간 간격 (초)',
            loopIntervalSeconds: '전체 작업 간간 간격 (초)'
          },
          description: {
            postIntervalSeconds: '각 게시글에 댓글을 쓰는 시간 간격',
            workIntervalSeconds: '작업 목록의 각 작업 간 시간 간격',
            loopIntervalSeconds: '작업 목록의 작업이 모두 끝나고 다시 첫 작업을 시작하는 시간 간격'
          },
          field: {
            prompt: {
              formal: '격식체',
              casual: '대화체',
              hyper: '과장형',
              custom: '사용자 지정'
            }
          },
          submit: '저장'
        },
        userMenu: {
          manageAccount: '인스타 계정 관리',
          logout: '로그아웃'
        },
        accountTable: {
          // "changePassword": "비밀번호 변경",
          // "enterPassword": "비밀번호 입력",
          // "passwordUpdated": "비밀번호가 업데이트되었습니다",
          // "passwordSave": "저장",
          // "editAccount": "계정 수정",
          title: '인스타그램 계정 관리',
          edit: '수정',
          save: '저장',
          addAccount: '계정 추가',
          add: '추가',
          delete: '삭제',
          cancel: '취소',
          deleteConfirmTitle: '계정 삭제',
          deleteConfirmDescription: "'{{username}}' 계정을 삭제하시겠습니까?",
          accountAdded: '계정이 추가되었습니다',
          accountUpdated: '계정이 수정되었습니다',
          accountDeleted: '계정이 삭제되었습니다',
          requiredFields: '모든 필드를 입력해주세요',
          usernameExists: '이미 존재하는 사용자 이름입니다',
          addError: '계정 추가 중 오류가 발생했습니다'
        },
        subscription: {
          inactive: '구독이 비활성화되었습니다. 구독을 시작하고 서비스를 이용해보세요.'
        }
      }
    }
  }
})
