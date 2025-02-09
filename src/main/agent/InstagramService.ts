import path from "node:path";
import { Worker } from "node:worker_threads";
import { AgentConfig, Work, WorkerStatus } from "../..";

export class InstagramService {
  private worker: Worker | null = null;
  private status: WorkerStatus = {
    state: "idle"
  };

  start(work: Work, config: AgentConfig) {
    if (this.worker) {
      console.log("이미 실행 중입니다.");
      return;
    }
    const workerPath = path.join(__dirname, "workers/test.js");
    this.worker = new Worker(workerPath, {
      workerData: {
        config,
      }
    });
    this.status = {
      state: "running",
      currentWork: work,
      running: {
        for: "starting",
        until: null,
      }
    }

    this.worker.on("message", (message) => {
      switch (message.type) {
        case "running":
          if (this.status.state === "running") {
            this.status.running = message.payload
          }
          else {
            console.log("실행 중이지 않은 워커의 running 이벤트 무시")
          }
          break;
        case "done":
          this.status.state = "done"
          break;
        case "error": 
          this.status = {
            state: "error",
            error: message.payload.message
          }
          break;
        default:
          console.log("알 수 없는 메시지")
      }
    })

    this.worker.on("exit", (code) => {
      console.log(`워커 종료, code = ${code}`)
      this.status = {
        state: "idle",
      }
      this.worker = null
    })
  }


  stop() {
    if (!this.worker) {
      console.log("실행 중인 작업이 없습니다")
      return;
    }
    this.worker.postMessage("stop")
  }
  
  getStatus() {
    return this.status
  }

  private cleanup() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }
}