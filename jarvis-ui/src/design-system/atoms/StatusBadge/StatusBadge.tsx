import Chip from "@mui/material/Chip"

export type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'primary'

interface Props {
  label: string
  variant?: BadgeVariant
}

const BADGE_COLORS: Record<BadgeVariant, { bg: string; color: string }> = {
  success: { bg: '#E8F5E9', color: '#27AE60' },
  error:   { bg: '#FFEBEE', color: '#E53E3E' },
  warning: { bg: '#FFF3E0', color: '#F6A623' },
  info:    { bg: '#E3F2FD', color: '#3498DB' },
  neutral: { bg: '#F4F7FB', color: '#5A6A85' },
  primary: { bg: '#EEF2F9', color: '#1E4FA3' },
}

export const StatusBadge = ({ label, variant = 'neutral' }: Props) => {
  const { bg, color } = BADGE_COLORS[variant]

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        bgcolor: bg,
        color,
        fontWeight: 700,
        fontSize: 11,
        border: 'none',
        height: 22,
        '& .MuiChip-label': { px: 1 },
      }}
    />
  )
}
