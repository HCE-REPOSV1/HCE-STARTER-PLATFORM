/**
 * ---------------------------------------------------------
 * Component: PatientRow
 * Author: Design System - Emergency Monitor
 * Created: 09-03-2026
 * Description:
 * Fila de la tabla de pacientes del Monitor de Emergencia.
 * Maneja todos los estados visuales: normal, hover, prioridad 1,
 * fila alternada y fila seleccionada.
 *
 * Columnas (en orden):
 *   Prioridad | Box | Paciente | Edad | Sexo | N.Documento |
 *   Médico | Lab | Img | Indc.Med | Interc. | Atención | Info
 *
 * Uso:
 *   <PatientRow data={patientData} isAlternate={false} />
 *
 * Estados de fila:
 *   normal     → fondo blanco
 *   alternate  → fondo #F4F7FB (cada 2 filas)
 *   priority1  → fondo #FFF5F5 (alerta crítica sutil)
 *   selected   → borde izquierdo azul + fondo hover
 *   hover      → fondo #EEF2F9 (siempre al pasar el cursor)
 * ---------------------------------------------------------
 */
import { TableRow, TableCell, Typography, Box } from "@mui/material"
import ScienceOutlinedIcon      from "@mui/icons-material/ScienceOutlined"
import ImageSearchOutlinedIcon  from "@mui/icons-material/ImageSearchOutlined"
import AssignmentOutlinedIcon   from "@mui/icons-material/AssignmentOutlined"
import PeopleAltOutlinedIcon    from "@mui/icons-material/PeopleAltOutlined"
import { PriorityBadge } from "../../atoms/PriorityBadge/PriorityBadge"
import type { PriorityLevel } from "../../atoms/PriorityBadge/PriorityBadge"
import { BoxBadge } from "../../atoms/BoxBadge/BoxBadge"
import type { BoxStatus } from "../../atoms/BoxBadge/BoxBadge"
import { ClinicalStatusIcon } from "../../atoms/ClinicalStatusIcon/ClinicalStatusIcon"
import type { ClinicalIconStatus } from "../../atoms/ClinicalStatusIcon/ClinicalStatusIcon"
import { AttentionCode }  from "../../atoms/AttentionCode/AttentionCode"
import { InfoButton }     from "../../atoms/InfoButton/InfoButton"
import { emergencyTokens } from "../../tokens/emergency.tokens"

/** Estructura de datos de un paciente en la tabla de emergencia */
export interface PatientRowData {
  /** Identificador único de la fila */
  id: string
  /** Prioridad de atención */
  priority: PriorityLevel
  /** Estado y etiqueta del box/sala */
  box: { status: BoxStatus; label: string }
  /** Datos del paciente */
  patient: { name: string; onClick?: () => void }
  /** Edad del paciente */
  age: number | string
  /** Sexo: "M" | "F" u otro */
  sex: string
  /** Número de documento de identidad */
  document: string
  /** Nombre del médico asignado */
  doctor: string
  /** Estado del laboratorio */
  lab: ClinicalIconStatus
  /** Estado de imágenes diagnósticas */
  img: ClinicalIconStatus
  /** Estado de indicaciones médicas */
  indication: ClinicalIconStatus
  /** Estado de interconsulta */
  interconsult: ClinicalIconStatus
  /** Código único de atención */
  attentionCode: string
  /** Si la fila está seleccionada */
  selected?: boolean
  /** Callback al hacer click en "Info" */
  onInfo?: () => void
}

interface Props {
  data:          PatientRowData
  /** Indica si es una fila impar (para color alternado) */
  isAlternate?:  boolean
}

/** Estilos base compartidos por cada celda */
const cellSx = {
  borderBottom: "none",
  padding:      "0 8px",
  height:       44,
}

/**
 * PatientRow
 *
 * Fila de 44px de altura con todas las columnas de la tabla de emergencia.
 * El color de fondo se determina en este orden de precedencia:
 *   selected > priority1 > alternate > normal
 * Hover siempre sobreescribe el fondo base con #EEF2F9.
 */
export const PatientRow = ({ data, isAlternate = false }: Props) => {
  const isPriority1 = data.priority === 1

  const baseBg = data.selected
    ? emergencyTokens.colors.hoverBg
    : isPriority1
      ? emergencyTokens.colors.rowPriority1Bg
      : isAlternate
        ? emergencyTokens.colors.rowAlternate
        : emergencyTokens.colors.surfaceBg

  return (
    <TableRow
      sx={{
        height:           44,
        backgroundColor:  baseBg,
        borderBottom:     "1px solid #E2EAF4",
        borderLeft:       data.selected
          ? `3px solid ${emergencyTokens.colors.tableHeaderBg}`
          : "3px solid transparent",
        transition:       "background-color 0.15s ease",
        cursor:           "default",
        "&:hover":        { backgroundColor: emergencyTokens.colors.hoverBg },
        "&:last-child td":{ borderBottom: "none" },
      }}
      selected={data.selected}
    >
      {/* ── Prioridad ── */}
      <TableCell sx={{ ...cellSx, width: 70, textAlign: "center" }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <PriorityBadge priority={data.priority} />
        </Box>
      </TableCell>

      {/* ── Box / Sala ── */}
      <TableCell sx={{ ...cellSx, width: 80, textAlign: "center" }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <BoxBadge status={data.box.status} label={data.box.label} />
        </Box>
      </TableCell>

      {/* ── Paciente (nombre clickeable) ── */}
      <TableCell sx={{ ...cellSx, width: 180, padding: "0 12px" }}>
        <Typography
          onClick={data.patient.onClick}
          sx={{
            fontFamily:     emergencyTokens.typography.fontFamily,
            fontSize:       emergencyTokens.typography.size.tableCell,
            fontWeight:     emergencyTokens.typography.weight.semibold,
            color:          emergencyTokens.colors.tableHeaderBg,
            cursor:         data.patient.onClick ? "pointer" : "default",
            userSelect:     "none",
            whiteSpace:     "nowrap",
            overflow:       "hidden",
            textOverflow:   "ellipsis",
            maxWidth:       "180px",
            display:        "block",
            "&:hover":      data.patient.onClick ? { textDecoration: "underline" } : {},
          }}
        >
          {data.patient.name}
        </Typography>
      </TableCell>

      {/* ── Edad ── */}
      <TableCell sx={{ ...cellSx, width: 55, textAlign: "center" }}>
        <Typography sx={{ fontFamily: emergencyTokens.typography.fontFamily, fontSize: "13px", color: emergencyTokens.colors.textPrimary }}>
          {data.age}
        </Typography>
      </TableCell>

      {/* ── Sexo ── */}
      <TableCell sx={{ ...cellSx, width: 55, textAlign: "center" }}>
        <Typography sx={{ fontFamily: emergencyTokens.typography.fontFamily, fontSize: "13px", color: emergencyTokens.colors.textPrimary }}>
          {data.sex}
        </Typography>
      </TableCell>

      {/* ── N.Documento ── */}
      <TableCell sx={{ ...cellSx, width: 100 }}>
        <Typography sx={{ fontFamily: emergencyTokens.typography.fontFamilyMono, fontSize: "12px", color: emergencyTokens.colors.textSecondary, letterSpacing: "0.3px" }}>
          {data.document}
        </Typography>
      </TableCell>

      {/* ── Médico ── */}
      <TableCell sx={{ ...cellSx, width: 160, padding: "0 12px" }}>
        <Typography sx={{ fontFamily: emergencyTokens.typography.fontFamily, fontSize: "13px", color: emergencyTokens.colors.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px", display: "block" }}>
          {data.doctor}
        </Typography>
      </TableCell>

      {/* ── Lab ── */}
      <TableCell sx={{ ...cellSx, width: 50, textAlign: "center" }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <ClinicalStatusIcon status={data.lab} icon={ScienceOutlinedIcon} tooltipLabel={`Laboratorio: ${data.lab}`} />
        </Box>
      </TableCell>

      {/* ── Img ── */}
      <TableCell sx={{ ...cellSx, width: 50, textAlign: "center" }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <ClinicalStatusIcon status={data.img} icon={ImageSearchOutlinedIcon} tooltipLabel={`Imágenes: ${data.img}`} />
        </Box>
      </TableCell>

      {/* ── Indicación médica ── */}
      <TableCell sx={{ ...cellSx, width: 50, textAlign: "center" }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <ClinicalStatusIcon status={data.indication} icon={AssignmentOutlinedIcon} tooltipLabel={`Indicación médica: ${data.indication}`} />
        </Box>
      </TableCell>

      {/* ── Interconsulta ── */}
      <TableCell sx={{ ...cellSx, width: 50, textAlign: "center" }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <ClinicalStatusIcon status={data.interconsult} icon={PeopleAltOutlinedIcon} tooltipLabel={`Interconsulta: ${data.interconsult}`} />
        </Box>
      </TableCell>

      {/* ── Código de atención ── */}
      <TableCell sx={{ ...cellSx, width: 90 }}>
        <AttentionCode code={data.attentionCode} />
      </TableCell>

      {/* ── Botón Info ── */}
      <TableCell sx={{ ...cellSx, width: 50, textAlign: "center" }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <InfoButton onClick={data.onInfo} />
        </Box>
      </TableCell>
    </TableRow>
  )
}
