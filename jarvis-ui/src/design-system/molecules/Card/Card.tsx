import { Card as MuiCard, CardContent, Typography, Box, Divider } from "@mui/material"
import type { ReactNode, CSSProperties } from "react"

interface Props {
  children?: ReactNode
  title?: string
  actions?: ReactNode
  style?: CSSProperties
  noPadding?: boolean
}

export const Card = ({ children, title, actions, style, noPadding }: Props) => {
  return (
    <MuiCard
      style={style}
      sx={{
        borderRadius: 3,
        boxShadow: '0 2px 12px rgba(26,58,107,0.08)',
        border: '1px solid #D0DBF0',
      }}
    >
      <CardContent sx={{ padding: noPadding ? '0 !important' : '20px !important' }}>
        {title && (
          <>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: '#1C2B4A', mb: 1.5 }}
            >
              {title}
            </Typography>
            <Divider sx={{ mb: 2, borderColor: '#D0DBF0' }} />
          </>
        )}
        <Box>{children}</Box>
        {actions && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            {actions}
          </Box>
        )}
      </CardContent>
    </MuiCard>
  )
}
