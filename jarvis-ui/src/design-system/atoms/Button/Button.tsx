/**
 * ---------------------------------------------------------
 * Component: Button
 * Author: Gregorovichz Carlos Rossi
 * Created: 09-03-2026
 * Updated: 20-03-2026 — extended props (backward compatible)
 * Description:
 * Wrapper del componente Button de Material UI utilizado
 * dentro del Design System de la aplicación.
 *
 * Objetivos:
 * - Estandarizar el uso de botones en todos los microfrontends
 * - Aplicar estilos consistentes del Design System
 * - Facilitar extensibilidad futura (themes, loading states, icons)
 *
 * Tecnologías:
 * - React
 * - TypeScript
 * - Material UI (MUI)
 *
 * Uso:
 * <Button label="Guardar" onClick={handleSave} />
 * <Button variant="secondary" size="sm">Cancelar</Button>
 *
 * ---------------------------------------------------------
 */
import MuiButton from "@mui/material/Button"
import type { ReactNode, CSSProperties } from "react"

/**
 * Props del componente Button
 */
interface Props {
  /** Texto que se mostrará dentro del botón (alternativa a children) */
  label?: string
  /** Contenido del botón como children */
  children?: ReactNode
  /** Función que se ejecuta al hacer click */
  onClick?: () => void
  /** Variante visual del botón */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  /** Tamaño del botón */
  size?: 'sm' | 'md' | 'lg'
  /** Deshabilitar el botón */
  disabled?: boolean
  /** Tipo HTML del botón */
  type?: 'button' | 'submit' | 'reset'
  /** Icono al inicio del botón */
  startIcon?: ReactNode
  /** Ancho completo */
  fullWidth?: boolean
  /** Estilos inline adicionales */
  style?: CSSProperties
}

const SIZE_SX: Record<string, object> = {
  sm: { padding: '4px 12px', fontSize: 13 },
  md: { padding: '8px 18px', fontSize: 14 },
  lg: { padding: '10px 24px', fontSize: 15 },
}

/**
 * Componente Button
 *
 * Encapsula el botón de Material UI para mantener consistencia
 * visual y funcional dentro del Design System.
 */
export const Button = ({
  label,
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  type = 'button',
  startIcon,
  fullWidth,
  style,
}: Props) => {
  const content = children ?? label

  if (variant === 'danger') {
    return (
      <MuiButton
        variant="contained"
        onClick={onClick}
        disabled={disabled}
        type={type}
        startIcon={startIcon}
        fullWidth={fullWidth}
        sx={{
          textTransform: "none",
          bgcolor: '#E53E3E',
          '&:hover': { bgcolor: '#c53030' },
          ...SIZE_SX[size],
        }}
        style={style}
      >
        {content}
      </MuiButton>
    )
  }

  if (variant === 'ghost') {
    return (
      <MuiButton
        variant="text"
        color="primary"
        onClick={onClick}
        disabled={disabled}
        type={type}
        startIcon={startIcon}
        fullWidth={fullWidth}
        sx={{ textTransform: "none", ...SIZE_SX[size] }}
        style={style}
      >
        {content}
      </MuiButton>
    )
  }

  if (variant === 'secondary') {
    return (
      <MuiButton
        variant="outlined"
        color="primary"
        onClick={onClick}
        disabled={disabled}
        type={type}
        startIcon={startIcon}
        fullWidth={fullWidth}
        sx={{ textTransform: "none", ...SIZE_SX[size] }}
        style={style}
      >
        {content}
      </MuiButton>
    )
  }

  // primary (default)
  return (
    <MuiButton
      variant="contained"
      color="primary"
      onClick={onClick}
      disabled={disabled}
      type={type}
      startIcon={startIcon}
      fullWidth={fullWidth}
      sx={{ textTransform: "none", ...SIZE_SX[size] }}
      style={style}
    >
      {content}
    </MuiButton>
  )
}
