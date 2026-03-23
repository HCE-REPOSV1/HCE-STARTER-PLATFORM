/**
 * ---------------------------------------------------------
 * Component: ActionIconButton
 * Author: Design System - Emergency Monitor
 * Created: 09-03-2026
 * Description:
 * Botón de acción icon-only para la barra de acciones del módulo
 * de emergencia. Tamaño 32x32px, borde redondeado 4px.
 *
 * Estados:
 *   default  → fondo blanco, borde #D0DBF0, ícono gris oscuro
 *   hover    → fondo #EEF2F9
 *   active   → fondo #D0DBF0
 *   disabled → opacidad 40%
 *
 * Uso:
 *   import FilterListIcon from "@mui/icons-material/FilterList"
 *   <ActionIconButton icon={FilterListIcon} tooltip="Filtrar pacientes" onClick={onFilter} />
 * ---------------------------------------------------------
 */
import { IconButton, Tooltip } from "@mui/material"
import type { SvgIconComponent } from "@mui/icons-material"
import { emergencyTokens } from "../../tokens/emergency.tokens"

interface Props {
  /** Componente de ícono MUI */
  icon:      SvgIconComponent
  /** Texto descriptivo del botón (requerido para accesibilidad) */
  tooltip:   string
  onClick?:  () => void
  disabled?: boolean
}

/**
 * ActionIconButton
 *
 * Botón cuadrado de 32x32px con border-radius 4px.
 * Fondo blanco con borde sutil. Hover con fondo azul muy claro.
 * Diseñado para agruparse en la ActionBar con separadores opcionales.
 */
export const ActionIconButton = ({ icon: Icon, tooltip, onClick, disabled = false }: Props) => {
  return (
    <Tooltip title={disabled ? "" : tooltip} placement="bottom">
      <span>
        <IconButton
          onClick={onClick}
          disabled={disabled}
          size="small"
          sx={{
            width:           32,
            height:          32,
            borderRadius:    emergencyTokens.borderRadius.sm,
            border:          `1px solid ${emergencyTokens.colors.border}`,
            backgroundColor: "#FFFFFF",
            color:           emergencyTokens.colors.textSecondary,
            padding:         0,

            "&:hover": {
              backgroundColor: emergencyTokens.colors.hoverBg,
              borderColor:     emergencyTokens.colors.tableHeaderBg,
              color:           emergencyTokens.colors.tableHeaderBg,
            },
            "&:active": {
              backgroundColor: emergencyTokens.colors.border,
            },
            "&.Mui-disabled": {
              opacity:         0.4,
              backgroundColor: "#FFFFFF",
              color:           emergencyTokens.colors.textSecondary,
            },
          }}
          aria-label={tooltip}
        >
          <Icon sx={{ fontSize: 16 }} />
        </IconButton>
      </span>
    </Tooltip>
  )
}
