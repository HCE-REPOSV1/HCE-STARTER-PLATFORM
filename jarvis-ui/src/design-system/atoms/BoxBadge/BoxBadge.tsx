/**
 * ---------------------------------------------------------
 * Component: BoxBadge
 * Author: Design System - Emergency Monitor
 * Created: 09-03-2026
 * Description:
 * Badge en forma de pill que representa el estado de una sala/box
 * asignada al paciente.
 *
 * Variantes de estado:
 *   active  → verde #27AE60  — sala asignada y activa
 *   urgent  → rojo  #E53E3E  — sala con paciente en estado crítico
 *   waiting → gris  #8A9BB0  — en espera, sin sala asignada
 *   tp      → gris oscuro #5A6A85 — sala de tópico
 *
 * Uso:
 *   <BoxBadge status="active" label="Box 3" />
 *   <BoxBadge status="waiting" label="Espera" />
 *   <BoxBadge status="tp" label="TP" />
 *
 * Guía de uso:
 *   - active:  paciente con sala asignada en atención normal
 *   - urgent:  sala con paciente crítico, requiere atención inmediata
 *   - waiting: paciente aguardando asignación de sala
 *   - tp:      paciente derivado a tópico de procedimientos
 * ---------------------------------------------------------
 */
import { Box } from "@mui/material"
import { emergencyTokens } from "../../tokens/emergency.tokens"

export type BoxStatus = "active" | "urgent" | "waiting" | "tp"

interface BoxStatusConfig {
  color: string
}

const STATUS_CONFIG: Record<BoxStatus, BoxStatusConfig> = {
  active:  { color: emergencyTokens.colors.boxActive  },
  urgent:  { color: emergencyTokens.colors.boxUrgent  },
  waiting: { color: emergencyTokens.colors.boxWaiting },
  tp:      { color: emergencyTokens.colors.boxTP      },
}

interface Props {
  /** Estado de la sala/box */
  status: BoxStatus
  /** Etiqueta visible: número de box, "Espera", "TP", etc. */
  label: string
}

/**
 * BoxBadge
 *
 * Pill de borde 1.5px del color del estado.
 * Fondo transparente, texto uppercase.
 * Tamaño: padding 3px 10px, border-radius 6px.
 *
 * Estados disponibles:
 *   active  → border + text verde
 *   urgent  → border + text rojo
 *   waiting → border + text gris
 *   tp      → border + text gris oscuro
 */
export const BoxBadge = ({ status, label }: Props) => {
  const config = STATUS_CONFIG[status]

  return (
    <Box
      component="span"
      sx={{
        display:         "inline-flex",
        alignItems:      "center",
        justifyContent:  "center",
        padding:         "3px 10px",
        borderRadius:    emergencyTokens.borderRadius.md,
        border:          `1.5px solid ${config.color}`,
        backgroundColor: "transparent",
        color:           config.color,
        fontFamily:      emergencyTokens.typography.fontFamily,
        fontSize:        emergencyTokens.typography.size.badge,
        fontWeight:      emergencyTokens.typography.weight.bold,
        textTransform:   "uppercase",
        letterSpacing:   "0.3px",
        whiteSpace:      "nowrap",
        cursor:          "default",
        userSelect:      "none",
        lineHeight:      1.4,
      }}
      aria-label={`Box ${label} — ${status}`}
    >
      {label}
    </Box>
  )
}
