import { Button } from '@hce/design-system'
import type { ReactNode, CSSProperties } from 'react'

interface BtnProps {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  disabled?: boolean
  size?: 'sm' | 'md'
  style?: CSSProperties
}

export default function Btn({ children, onClick, type, variant = 'primary', disabled, size = 'md', style }: BtnProps) {
  return (
    <Button
      onClick={onClick}
      type={type}
      variant={variant}
      disabled={disabled}
      size={size}
      style={style}
    >
      {children}
    </Button>
  )
}
