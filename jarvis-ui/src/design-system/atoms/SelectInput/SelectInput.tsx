import { FormControl, InputLabel, Select, MenuItem } from "@mui/material"

interface Option {
  value: string
  label: string
}

interface Props {
  label?: string
  value: string
  onChange: (v: string) => void
  options: readonly Option[]
  disabled?: boolean
  fullWidth?: boolean
  size?: 'small' | 'medium'
  required?: boolean
}

export const SelectInput = ({
  label,
  value,
  onChange,
  options,
  disabled,
  fullWidth = true,
  size = 'small',
  required,
}: Props) => {
  const labelId = label ? `select-label-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined

  if (label) {
    return (
      <FormControl fullWidth={fullWidth} size={size} required={required} disabled={disabled}>
        <InputLabel id={labelId}>{label}</InputLabel>
        <Select
          labelId={labelId}
          value={value}
          label={label}
          onChange={(e) => onChange(e.target.value as string)}
          variant="outlined"
        >
          {options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    )
  }

  return (
    <FormControl fullWidth={fullWidth} size={size} required={required} disabled={disabled}>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as string)}
        variant="outlined"
        displayEmpty
      >
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
