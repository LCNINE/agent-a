import { Link, LinkProps, useNavigate } from '@tanstack/react-router'
import React from 'react'
import { cn } from '@/lib/utils'
import { useConfigStore } from '@renderer/store/configStore'
interface ProtectedLinkProps extends LinkProps {
  isDirty: boolean
  children: React.ReactNode
  btnClassName?: string
}

export default function ProtectedLink({
  isDirty,
  children,
  btnClassName,
  ...props
}: ProtectedLinkProps) {
  const navigate = useNavigate()
  const { setIsDirty } = useConfigStore()

  const handleClick = async (e: React.MouseEvent) => {
    if (isDirty) {
      e.preventDefault()
      const confirmed = await window.dialog.showConfirmation()

      if (!confirmed) {
        setIsDirty(false)
        navigate({ to: props.to })
      }
    }
  }

  return isDirty ? (
    <div onClick={handleClick} className={cn(btnClassName, 'cursor-pointer')}>
      {children}
    </div>
  ) : (
    <Link {...props}>{children}</Link>
  )
}
