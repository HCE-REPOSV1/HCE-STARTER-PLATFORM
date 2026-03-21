import { Card as DSCard } from '@jarvis/design-system'
import type { ReactNode, CSSProperties } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  style?: CSSProperties
}

export default function Card({ title, children, style }: CardProps) {
  return <DSCard title={title} style={style}>{children}</DSCard>
}
