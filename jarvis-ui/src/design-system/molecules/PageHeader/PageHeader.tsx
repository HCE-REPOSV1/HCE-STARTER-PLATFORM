import { Box, Typography } from "@mui/material"
import type { ReactNode } from "react"

interface Props {
  icon?: ReactNode
  title: string
  description?: string
  actions?: ReactNode
}

export const PageHeader = ({ icon, title, description, actions }: Props) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        mb: 3,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        {icon && (
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: '#EEF2F9',
              color: '#1E4FA3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        )}
        <Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: '#1C2B4A', lineHeight: 1.3 }}
          >
            {title}
          </Typography>
          {description && (
            <Typography
              variant="body2"
              sx={{ color: '#5A6A85', mt: 0.5 }}
            >
              {description}
            </Typography>
          )}
        </Box>
      </Box>
      {actions && (
        <Box sx={{ flexShrink: 0, ml: 2 }}>
          {actions}
        </Box>
      )}
    </Box>
  )
}
