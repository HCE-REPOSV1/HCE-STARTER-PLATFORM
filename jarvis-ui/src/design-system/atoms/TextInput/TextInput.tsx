import TextField from "@mui/material/TextField"

interface Props {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  disabled?: boolean
  error?: string
  fullWidth?: boolean
  size?: 'small' | 'medium'
  multiline?: boolean
  rows?: number
}

export const TextInput = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  disabled,
  error,
  fullWidth = true,
  size = 'small',
  multiline,
  rows,
}: Props) => {
  return (
    <TextField
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      required={required}
      disabled={disabled}
      helperText={error}
      error={!!error}
      fullWidth={fullWidth}
      size={size}
      variant="outlined"
      multiline={multiline}
      rows={rows}
    />
  )
}
