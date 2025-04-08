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
          error: {
            noAccountSelected: 'No account selected'
          },
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
          title: 'Work Management',
          workList: {
            item1: {
              title: 'Hashtag and Feed Work',
              description: 'Add hashtag and feed work.'
            },
            item2: {
              title: 'My Feed Work',
              description: 'Like the comments on my feed and like the posts on the account.'
            }
          }
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
          prompt: {
            formalDesc: 'Creates comments with a respectful and formal tone.',
            casualDesc: 'Creates comments with a relaxed and friendly tone.',
            hyperDesc: 'Creates comments with expressive and energetic language.',
            customDesc: 'Provides a personalized comment creation environment.'
          },

          toast: {
            submitSuccess: 'Configuration saved successfully!'
          },
          validation: {
            preset: 'Choose one of the conversational styles',
            workCount: 'The number of works must be at least 1'
          },
          label: {
            commentLength: 'Comment Length Setting',
            workCount: 'Work Count',
            prompt: 'Comment Style Setting',
            shortComment: {
              label: 'Short',
              description: '(20 characters or less)'
            },
            normalComment: {
              label: 'Normal',
              description: '(50 characters or less)'
            },
            longComment: {
              label: 'Long',
              description: '(100 characters or less)'
            },
            postIntervalSeconds: 'Post Interval (Seconds)',
            workIntervalSeconds: 'Work Interval (Seconds)',
            loopIntervalSeconds: 'Loop Interval (Seconds)',
            excludeUsernames: 'Blocked Accounts'
          },
          description: {
            postIntervalSeconds: 'This means the time interval for writing comments on each post.',
            workIntervalSeconds:
              'After one task is completed, the system will wait this amount of time before starting the next task. A task refers to a hashtag task, feed task, or my feed comment task.',
            loopIntervalSeconds:
              'After all activated tasks are completed, the system will wait this amount of time before starting the first task again.',
            excludeUsernames: 'Please enter the accounts you want to block'
          },
          field: {
            prompt: {
              formal: 'Formal',
              casual: 'Casual',
              hyper: 'Hyper',
              custom: 'Custom'
            }
          },

          select: {
            second: 'second',
            minute: 'minute',
            hour: 'hour'
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
          editDescription: 'Edit the account information',
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
          accountSelected: 'Account has been selected',
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
          error: {
            noAccountSelected: '인스타계정을 선택해주세요'
          },
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
          title: '작업 관리',
          workList: {
            item1: {
              title: '해시태그 및 피드 작업',
              description: '해시태그 및 피드 작업을 추가합니다.'
            },
            item2: {
              title: '내 피드 작업',
              description:
                '내 피드에 달린 댓글을 좋아요 누르고, 해당 계정으로 가서 게시글 좋아요를 눌러줍니다.'
            }
          }
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
          prompt: {
            formalDesc: '존중하고 격식 있는 어조로 댓글을 작성합니다.',
            casualDesc: '편안하고 친근한 어조로 댓글을 작성합니다.',
            hyperDesc: '표현력 있고 활기찬 언어로 댓글을 작성합니다.',
            customDesc: '개인화된 댓글 작성 환경을 제공합니다.'
          },
          toast: {
            submitSuccess: '설정이 저장되었습니다!'
          },

          validation: {
            workCount: '작업 갯수는 최소 1개 이상이어야 합니다',
            preset: '대화체 하나를 선택해주세요'
          },
          label: {
            prompt: '댓글 스타일 설정 ',
            workCount: '작업 개수',
            commentLength: '댓글 길이 설정',
            shortComment: {
              label: '짧게',
              description: '(20자 이내)'
            },
            normalComment: {
              label: '보통',
              description: '(50자 이내)'
            },
            longComment: {
              label: '길게',
              description: '(100자 이내)'
            },
            postIntervalSeconds: '댓글 작성후 쉬는 시간',
            workIntervalSeconds: '작업 사이 대기 시간',
            loopIntervalSeconds: '일일 총 작업 제한',
            excludeUsernames: '차단할 계정'
          },
          description: {
            postIntervalSeconds: '각 게시글에 댓글을 쓰는 시간 간격을 의미합니다.',
            workIntervalSeconds:
              '한 작업이 끝나면 이 시간만큼 대기하고 다음 작업을 시작합니다. 한 작업이란 해시태그 작업 또는 피드 작업 또는 내 피드 댓글작업을 의미합니다.',
            loopIntervalSeconds:
              '활성화된 작업이 모두 끝나고 이 시간만큼 대기하고 다시 첫 작업을 시작합니다.',
            excludeUsernames: '차단할 계정을 입력해주세요'
          },
          field: {
            prompt: {
              formal: '정중한 모드',
              casual: '친근한 모드',
              hyper: '열정적인 모드',
              custom: '사용자 지정'
            }
          },
          select: {
            second: '초',
            minute: '분',
            hour: '시간'
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
          editDescription: '계정 정보를 수정합니다',
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
          accountSelected: '계정이 선택되었습니다',
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
