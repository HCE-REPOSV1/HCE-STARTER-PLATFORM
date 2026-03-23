/**
 * ---------------------------------------------------------
 * Component: PriorityBadge
 * Author: Design System - Emergency Monitor
 * Created: 09-03-2026
 * Description:
 * Badge circular que indica la prioridad de atención de un paciente.
 *
 * Sistema de prioridades:
 *   1 — Crítico  → rojo   #E53E3E
 *   2 — Urgente  → naranja #F6A623
 *   3 — Moderado → verde  #27AE60
 *   4 — Leve     → azul   #3498DB
 *  'none' — Sin prioridad → gris con borde vacío
 *
 * Uso:
 *   <PriorityBadge priority={1} />
 *   <PriorityBadge priority="none" />
 *
 * Guía de uso:
 *   - Usar prioridad 1 solo para pacientes en riesgo vital inmediato
 *   - Prioridad 2: condiciones que pueden deteriorarse rápidamente
 *   - Prioridad 3: condición estable que requiere atención en 30 min
 *   - Prioridad 4: condición leve, puede esperar
 *   - "none": paciente aún no evaluado o sin clasificación
 * ---------------------------------------------------------
 */
import { Box, Tooltip } from "@mui/material"
import { emergencyTokens } from "../../tokens/emergency.tokens"

export type PriorityLevel = 1 | 2 | 3 | 4 | "none"

interface PriorityConfig {
  color:       string
  label:       string
  description: string
}

const PRIORITY_CONFIG: Record<string, PriorityConfig> = {
  "1":    { color: emergencyTokens.colors.priority1,    label: "1", description: "Prioridad 1 — Crítico" },
  "2":    { color: emergencyTokens.colors.priority2,    label: "2", description: "Prioridad 2 — Urgente" },
  "3":    { color: emergencyTokens.colors.priority3,    label: "3", description: "Prioridad 3 — Moderado" },
  "4":    { color: emergencyTokens.colors.priority4,    label: "4", description: "Prioridad 4 — Leve" },
  "none": { color: emergencyTokens.colors.priorityNone, label: "",  description: "Sin prioridad asignada" },
}

interface Props {
  /** Nivel de prioridad del paciente */
  priority: PriorityLevel
  /** Texto personalizado para el tooltip (opcional) */
  tooltipText?: string
}

/**
 * PriorityBadge
 *
 * Círculo de 24px de diámetro con el número de prioridad centrado.
 * - Prioridades 1–4: fondo sólido del color de prioridad, número en blanco
 * - "none": círculo vacío con borde gris, sin número
 */
export const PriorityBadge = ({ priority, tooltipText }: Props) => {
  const key = String(priority)
  const config = PRIORITY_CONFIG[key]
  const isNone = priority === "none"

  return (
    <Tooltip
      title={tooltipText ?? config.description}
      placement="top"
      arrow
    >
      <Box
        sx={{
          width:           24,
          height:          24,
          borderRadius:    "50%",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          flexShrink:      0,
          cursor:          "default",

          // Apariencia según estado
          backgroundColor: isNone ? "transparent" : config.color,
          border:          isNone ? `2px solid ${config.color}` : "none",
          color:           isNone ? config.color : "#FFFFFF",

          // Tipografía del badge
          fontFamily:  emergencyTokens.typography.fontFamily,
          fontSize:    emergencyTokens.typography.size.badge,
          fontWeight:  emergencyTokens.typography.weight.extrabold,
          lineHeight:  1,
          userSelect:  "none",
        }}
        aria-label={config.description}
        role="img"
      >
        {!isNone && config.label}
      </Box>
    </Tooltip>
  )
}
