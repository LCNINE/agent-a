# unknown

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

### Release

태그 푸시 시 GitHub Actions가 자동으로 빌드 및 릴리스합니다.

```bash
$ npm version patch   # 버전 업 (예: 1.0.51 → 1.0.52)
$ git push origin main --tags
```

## Local Data Storage

앱 데이터는 아래 경로에 저장됩니다.

### Mac

```
~/Library/Application Support/agent-a/
```

터미널에서 확인:

```bash
open ~/Library/Application\ Support/agent-a/
```

### Windows

```
%APPDATA%/agent-a/
```

### 저장되는 데이터

| 폴더/파일                        | 설명                              |
| -------------------------------- | --------------------------------- |
| `commentHistory/`                | 댓글 작성 기록 (중복 댓글 방지용) |
| `commentHistory/{username}.json` | 계정별 댓글 기록 파일             |

댓글 기록은 30일 후 자동 삭제됩니다.
