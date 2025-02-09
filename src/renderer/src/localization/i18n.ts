import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  fallbackLng: "en",
  resources: {
    en: {
      translation: {
        appName: "AI Instagram Manager",
        loginForm: {
          title: "Login",
          email: {
            label: "Email",
          },
          password: {
            label: "Password",
            forgot: "Forgot password?",
          },
          submit: "Login",
          noAccount: "Don't have an account?",
          applyForAccount: "Apply for one",
        },
        nav: {
          homePage: "Home",
          workPage: "Work",
          configPage: "Config",
        },
        homePage: {
        },
        AgentController: {
          status: {
            idle: "Not currently working",
            working: "Working in progress"
          },
          action: {
            start: "Start",
            stop: "Stop"
        }
        },
        workPage: {
          title: "Work Management"
        },
        work: {
          type: {
            feed: "Feed",
            hashtag: "Hashtag"
          }
        },
        workForm: {
          trigger: {
            create: "Add Work",
            update: "Update Work"
          },
          title: {
            create: "Add Work",
            update: "Update Work"
          },
          submit: {
            create: "Add",
            update: "Update"
          },
          type: {
            label: "Type",
            select: {
              feed: "Feed",
              hashtag: "Hashtag"
            }
          },
          tag: {
            label: "Tag"
          }
        },
        configPage: {
          title: "Config"
        },
        configForm: {
          toast: {
            submitSuccess: "Configuration saved successfully!",
          },
          label: {
            prompt: "Prompt Preset",
            commentLength: {
              min: "Minimum Comment Length",
              max: "Maximum Comment Length",
            },
            postIntervalSeconds: "Post Interval (Seconds)",
            workIntervalSeconds: "Work Interval (Seconds)",
            loopIntervalSeconds: "Loop Interval (Seconds)",
          },
          description: {
            postIntervalSeconds: "Time interval between posting comments on each post",
            workIntervalSeconds: "Time interval between each task in the task list",
            loopIntervalSeconds: "Time interval after all tasks in the task list are completed before restarting from the first task",
          },          
          field: {
            prompt: {
              formal: "Formal",
              casual: "Casual",
              hyper: "Hyper",
              custom: "Custom",
            },
          },
          submit: "Save",
        },
        userMenu :{
          manageAccount : "Managing Instagram accounts",
          logout: "Logout"
        },
        "accountTable": {
          "title": "Instagram Account Management",
          "changePassword": "Change Password",
          "enterPassword": "Enter Password",
          "passwordUpdated": "Password has been updated",
          "passwordSave": "Save"
        }

      },
    },
    "ko-KR": {
      translation: {
        appName: "AI 인스타그램 매니저",
        loginForm: {
          title: "로그인",
          email: {
            label: "이메일",
          },
          password: {
            label: "비밀번호",
            forgot: "비밀번호 찾기",
          },
          submit: "로그인",
          success: "로그인되었습니다",
          error: "로그인에 실패했습니다",
          noAccount: "계정이 없으신가요?",
          applyForAccount: "신청하기",
        },
        nav: {
          homePage: "홈",
          workPage: "작업",
          configPage: "설정",
        },
        homePage: {

        },
        AgentController: {
          status: {
            idle: "작업 중이 아닙니다.",
            working: "작업중입니다."
          },
          action: {
            start: "시작",
            stop: "정지"
          }
        },
        workPage: {
          title: "작업 관리", 
        },
        work: {
          type: {
            feed: "피드",
            hashtag: "해시태그"
          }
        },
        workForm: {
          trigger: {
            create: "작업 추가",
            update: "작업 수정",
          },
          title: {
            create: "작업 추가",
            update: "작업 수정",
          },
          submit: {
            create: "추가",
            update: "수정",
          },
          type: {
            label: "종류",
            select: {
              feed: "피드",
              hashtag: "해시태그"
            },
          },
          tag: {
            label: "태그",
          }
        },
        configPage: {
          title: "설정"
        },
        configForm: {
          toast: {
            submitSuccess: "설정이 저장되었습니다!",
          },
          label: {
            prompt: "프롬프트 프리셋",
            commentLength: {
              min: "최소 댓글 길이",
              max: "최대 댓글 길이",
            },
            postIntervalSeconds: "댓글 시간 간격 (초)",
            workIntervalSeconds: "작업 간 간격 (초)",
            loopIntervalSeconds: "전체 작업 간간 간격 (초)",
          },
          description: {
            postIntervalSeconds: "각 게시글에 댓글을 쓰는 시간 간격",
            workIntervalSeconds: "작업 목록의 각 작업 간 시간 간격",
            loopIntervalSeconds: "작업 목록의 작업이 모두 끝나고 다시 첫 작업을 시작하는 시간 간격",
          },
          field: {
            prompt: {
              formal: "격식체",
              casual: "대화체",
              hyper: "과장형",
              custom: "사용자 지정",
            },
          },
          submit: "저장",
        },
        userMenu :{
          manageAccount : "인스타 계정 관리",
          logout: "로그아웃"
        },
        accountTable: {
          "title":"인스타그램 계정 관리",
          "changePassword": "비밀번호 변경",
          "enterPassword": "비밀번호 입력",
          "passwordUpdated": "비밀번호가 업데이트되었습니다",
          "passwordSave": "저장"
        },
      },
    },
  },
});
