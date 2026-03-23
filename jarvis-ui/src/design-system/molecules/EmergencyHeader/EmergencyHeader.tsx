/**
 * ---------------------------------------------------------
 * Component: EmergencyHeader
 * Author: Design System - Emergency Monitor
 * Created: 09-03-2026
 * Description:
 * Barra de encabezado principal del módulo Monitor de Emergencia.
 * Fondo azul marino institucional, full-width.
 *
 * Disposición:
 *   [Logo] [Título del módulo]    →    [Chip fecha/hora] [Chip sede]
 *
 * Uso:
 *   <EmergencyHeader
 *     title="Monitor de Emergencia"
 *     logoSrc="/assets/logo-clinica.svg"
 *     dateTime="Lun 09 Mar 2026 — 14:32"
 *     sede="Sede Central"
 *   />
 * ---------------------------------------------------------
 */
import { Box, Typography, Chip } from "@mui/material"
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth"
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined"
import { emergencyTokens } from "../../tokens/emergency.tokens"

interface Props {
  /** Título principal del módulo (ej: "Monitor de Emergencia") */
  title: string
  /** URL del logo de la clínica (opcional) */
  logoSrc?: string
  /** Alt text del logo */
  logoAlt?: string
  /** Fecha y hora formateada (ej: "Lun 09 Mar 2026 — 14:32") */
  dateTime?: string
  /** Nombre de la sede activa */
  sede?: string
}

/** Estilos compartidos para los chips del header */
const chipSx = {
  backgroundColor: "rgba(255, 255, 255, 0.12)",
  color:           "#FFFFFF",
  border:          "1px solid rgba(255, 255, 255, 0.25)",
  fontFamily:      emergencyTokens.typography.fontFamily,
  fontSize:        emergencyTokens.typography.size.headerMeta,
  fontWeight:      emergencyTokens.typography.weight.medium,
  textTransform:   "uppercase" as const,
  letterSpacing:   "0.3px",
  height:          28,
  borderRadius:    "4px",
  "& .MuiChip-icon": {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 14,
    marginLeft: "8px",
  },
  "& .MuiChip-label": {
    paddingLeft:  "6px",
    paddingRight: "10px",
  },
}

/**
 * EmergencyHeader
 *
 * Barra azul marino (height 56px) full-width.
 * Izquierda: logo + título. Derecha: chip fecha/hora + chip sede.
 */
export const EmergencyHeader = ({
  title,
  logoSrc,
  logoAlt = "Logo clínica",
  dateTime,
  sede,
}: Props) => {
  return (
    <Box
      component="header"
      sx={{
        width:           "100%",
        backgroundColor: emergencyTokens.colors.headerBg,
        boxShadow:       emergencyTokens.shadows.header,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "space-between",
        padding:         "0 24px",
        height:          56,
        flexShrink:      0,
        zIndex:          emergencyTokens.zIndex.stickyHeader,
      }}
    >
      {/* ─── Izquierda: Logo + Título ─── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {logoSrc && (
          <Box
            component="img"
            src={logoSrc}
            alt={logoAlt}
            sx={{ height: 32, objectFit: "contain", flexShrink: 0 }}
          />
        )}
        <Typography
          component="h1"
          sx={{
            fontFamily: emergencyTokens.typography.fontFamily,
            fontSize:   emergencyTokens.typography.size.headerTitle,
            fontWeight: emergencyTokens.typography.weight.bold,
            color:      "#FFFFFF",
            margin:     0,
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          {title}
        </Typography>
      </Box>

      {/* ─── Derecha: Chips de contexto ─── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {dateTime && (
          <Chip
            icon={<CalendarMonthIcon />}
            label={dateTime}
            size="small"
            sx={chipSx}
          />
        )}
        {sede && (
          <Chip
            icon={<LocationOnOutlinedIcon />}
            label={sede}
            size="small"
            sx={chipSx}
          />
        )}
      </Box>
    </Box>
  )
}
