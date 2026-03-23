/**
 * ---------------------------------------------------------
 * Component: InfoButton
 * Author: Design System - Emergency Monitor
 * Created: 09-03-2026
 * Description:
 * Botón circular de acción que abre el panel de información
 * detallada del paciente. Aparece en la última columna de la
 * tabla de pacientes.
 *
 * Estados:
 *   default  → fondo azul #2B5BA8, ícono ojo blanco
 *   hover    → fondo azul marino #1A3A6B
 *   active   → fondo oscuro + escala 0.95
 *   disabled → opacidad 40%
 *
 * Uso:
 *   <InfoButton onClick={() => openPatientPanel(patient.id)} />
 *   <InfoButton disabled />
 * ---------------------------------------------------------
 */
import { IconButton, Tooltip } from "@mui/material"
import VisibilityIcon from "@mui/icons-material/Visibility"
import { emergencyTokens } from "../../tokens/emergency.tokens"

interface Props {
  onClick?:  () => void
  tooltip?:  string
  disabled?: boolean
}

/**
 * InfoButton
 *
 * Círculo de 28x28px.
 * Fondo azul institucional (#2B5BA8), ícono ojo blanco.
 * Hover: azul marino (#1A3A6B).
 */
export const InfoButton = ({ onClick, tooltip = "Ver información del paciente", disabled = false }: Props) => {
  return (
    <Tooltip title={disabled ? "" : tooltip} placement="top">
      <span>
        <IconButton
          onClick={onClick}
          disabled={disabled}
          size="small"
          sx={{
            width:           28,
            height:          28,
            borderRadius:    "50%",
            padding:         0,
            backgroundColor: emergencyTokens.colors.tableHeaderBg,
            color:           "#FFFFFF",
            flexShrink:      0,

            "&:hover": {
              backgroundColor: emergencyTokens.colors.headerBg,
            },
            "&:active": {
              backgroundColor: emergencyTokens.colors.headerBg,
              transform:       "scale(0.95)",
            },
            "&.Mui-disabled": {
              backgroundColor: emergencyTokens.colors.tableHeaderBg,
              opacity:         0.4,
              color:           "#FFFFFF",
            },
          }}
          aria-label={tooltip}
        >
          <VisibilityIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </span>
    </Tooltip>
  )
}
