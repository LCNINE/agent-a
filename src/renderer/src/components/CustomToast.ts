import { toast } from 'sonner'

type ToastPosition =
  | 'top-left'
  | 'top-right'
  | 'top-center'
  | 'bottom-left'
  | 'bottom-right'
  | 'bottom-center'

type ToastAction = {
  label: string
  onClick: () => void
}

type CustomToastProps = {
  status: 'error' | 'success' | 'info'
  message: string
  description?: string
  position: ToastPosition
  duration?: number
  action?: ToastAction
}

export const CustomToast = ({
  status,
  message,
  description,
  position,
  duration,
  action
}: CustomToastProps) => {
  const toastOptions = {
    style: {
      background: status === 'error' ? '#FEE2E2' : status === 'success' ? '#D1FAE5' : '#F3F4F6',
      color: status === 'error' ? '#991B1B' : status === 'success' ? '#059669' : '#374151',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      border:
        status === 'error'
          ? '1px solid #FCA5A5'
          : status === 'success'
            ? '1px solid #A3E635'
            : '1px solid #E5E7EB',
      fontWeight: '500'
    },
    icon: status === 'error' ? '🚫' : status === 'success' ? '✅' : 'ℹ️',
    duration: duration,
    position: position,
    description: description,
    action: action
      ? {
          label: action.label,
          onClick: action.onClick
        }
      : undefined
  }

  if (status === 'error') {
    return toast.error(message, toastOptions)
  } else if (status === 'success') {
    return toast.success(message, toastOptions)
  } else {
    return toast(message, toastOptions)
  }
}
