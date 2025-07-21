import React from 'react'

export default function Footer() {
  return (
    <footer className="font-spoqa inline-flex justify-between text-[0.7rem] uppercase text-muted-foreground">
      <a
        href={process.env.LOGIN_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="transition-colors duration-200 hover:text-primary"
        tabIndex={0}
        aria-label="웹사이트 방문하기"
      >
        웹사이트 방문하기
      </a>
      <p>AlmondYoung</p>
    </footer>
  )
}
