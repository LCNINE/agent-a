import React from 'react'

export default function Footer() {
  return (
    <footer className="font-spoqa flex items-center justify-between px-4 py-3 text-[0.7rem] text-muted-foreground/70 border-t border-border/30 bg-background/50 backdrop-blur-sm">
      <a
        href="https://agent-a.me/auth/login"
        target="_blank"
        rel="noopener noreferrer"
        className="cursor-pointer transition-all duration-200 ease-apple hover:text-primary hover:scale-[1.02]"
        tabIndex={0}
        aria-label="웹사이트 방문하기"
      >
        웹사이트 방문하기
      </a>
      <p className="font-medium">AlmondYoung</p>
    </footer>
  )
}
