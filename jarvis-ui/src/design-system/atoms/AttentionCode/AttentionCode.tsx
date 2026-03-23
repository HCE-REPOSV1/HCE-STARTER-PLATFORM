/**
 * ---------------------------------------------------------
 * Component: AttentionCode
 * Author: Design System - Emergency Monitor
 * Created: 09-03-2026
 * Description:
 * Muestra el código alfanumérico único de atención del paciente
 * (ej: E097382) en fuente monoespaciada para facilitar la lectura
 * y el copiado por parte del personal clínico.
 *
 * Uso:
 *   <AttentionCode code="E097382" />
 * ---------------------------------------------------------
 */
import { Typography } from "@mui/material"
import { emergencyTokens } from "../../tokens/emergency.tokens"

interface Props {
  /** Código alfanumérico de atención (ej: "E097382") */
  code: string
}

/**
 * AttentionCode
 *
 * Texto monoespaciado, 13px, color primario.
 * Sin decoraciones adicionales.
 */
export const AttentionCode = ({ code }: Props) => {
  return (
    <Typography
      component="span"
      sx={{
        fontFamily:    emergencyTokens.typography.fontFamilyMono,
        fontSize:      emergencyTokens.typography.size.tableCell,
        fontWeight:    emergencyTokens.typography.weight.regular,
        color:         emergencyTokens.colors.textPrimary,
        letterSpacing: "0.5px",
        display:       "inline-block",
      }}
      aria-label={`Código de atención: ${code}`}
    >
      {code}
    </Typography>
  )
}
