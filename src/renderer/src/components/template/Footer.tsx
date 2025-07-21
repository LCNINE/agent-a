import React from 'react'

export default function Footer() {
  return (
    <footer className="font-spoqa inline-flex justify-between text-[0.7rem] uppercase text-muted-foreground">
      <a
        href="https://agent-a.me/auth/login"
        target="_blank"
        rel="noopener noreferrer"
        className="cursor-pointer transition-colors duration-200 hover:text-primary"
        tabIndex={0}
        aria-label="웹사이트 방문하기"
      >
        웹사이트 방문하기
      </a>
      <p>AlmondYoung</p>
    </footer>
  )
}
