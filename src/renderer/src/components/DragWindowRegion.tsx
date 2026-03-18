import React, { type ReactNode } from 'react'
import { closeWindow, maximizeWindow, minimizeWindow } from '@renderer/helpers/window'

interface DragWindowRegionProps {
  title?: ReactNode
}

export default function DragWindowRegion({ title }: DragWindowRegionProps) {
  return (
    <div className="flex w-screen items-stretch justify-between bg-background/60 backdrop-blur-xl border-b border-border/50">
      <div className="draglayer w-full">
        {title && (
          <div className="flex flex-1 select-none whitespace-nowrap p-2.5 text-xs font-medium text-muted-foreground/70">
            {title}
          </div>
        )}
      </div>
      <WindowButtons />
    </div>
  )
}

function WindowButtons() {
  return (
    <div className="flex items-center">
      <button
        title="Minimize"
        type="button"
        className="flex items-center justify-center w-12 h-9 text-muted-foreground/60 hover:bg-muted/80 hover:text-foreground transition-all duration-150 ease-apple"
        onClick={minimizeWindow}
      >
        <svg aria-hidden="true" role="img" width="10" height="10" viewBox="0 0 12 12">
          <rect fill="currentColor" width="10" height="1" x="1" y="6"></rect>
        </svg>
      </button>
      <button
        title="Maximize"
        type="button"
        className="flex items-center justify-center w-12 h-9 text-muted-foreground/60 hover:bg-muted/80 hover:text-foreground transition-all duration-150 ease-apple"
        onClick={maximizeWindow}
      >
        <svg aria-hidden="true" role="img" width="10" height="10" viewBox="0 0 12 12">
          <rect width="9" height="9" x="1.5" y="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" rx="1"></rect>
        </svg>
      </button>
      <button
        type="button"
        title="Close"
        className="flex items-center justify-center w-12 h-9 text-muted-foreground/60 hover:bg-destructive hover:text-destructive-foreground transition-all duration-150 ease-apple"
        onClick={closeWindow}
      >
        <svg aria-hidden="true" role="img" width="10" height="10" viewBox="0 0 12 12">
          <polygon
            fill="currentColor"
            fillRule="evenodd"
            points="11 1.576 6.583 6 11 10.424 10.424 11 6 6.583 1.576 11 1 10.424 5.417 6 1 1.576 1.576 1 6 5.417 10.424 1"
          ></polygon>
        </svg>
      </button>
    </div>
  )
}
