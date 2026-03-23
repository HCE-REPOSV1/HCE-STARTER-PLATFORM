import { FormControlLabel, Checkbox as MuiCheckbox } from "@mui/material"

interface Props {
  label?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}

export const Checkbox = ({ label, checked, onChange, disabled }: Props) => {
  const checkbox = (
    <MuiCheckbox
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      size="small"
    />
  )

  if (label) {
    return (
      <FormControlLabel
        control={checkbox}
        label={label}
        disabled={disabled}
      />
    )
  }

  return checkbox
}
