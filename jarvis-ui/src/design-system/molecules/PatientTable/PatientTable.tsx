/**
 * ---------------------------------------------------------
 * Component: PatientTable
 * Author: Design System - Emergency Monitor
 * Created: 09-03-2026
 * Description:
 * Tabla completa de pacientes del Monitor de Emergencia.
 * Header sticky con fondo azul medio, filas de 44px de altura.
 *
 * Columnas definidas:
 *   Prioridad (70px) | Box (80px) | Paciente (180px) | Edad (55px) |
 *   Sexo (55px) | N.Documento (100px) | Médico (160px) |
 *   Lab (50px) | Img (50px) | Indc.Med (50px) | Interc. (50px) |
 *   Atención (90px) | Info (50px)
 *
 * Ancho mínimo total: ~1100px (diseñado para pantallas 1280px+)
 *
 * Uso:
 *   <PatientTable rows={patientsData} />
 * ---------------------------------------------------------
 */
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
} from "@mui/material"
import { PatientRow } from "../PatientRow/PatientRow"
import type { PatientRowData } from "../PatientRow/PatientRow"
import { emergencyTokens } from "../../tokens/emergency.tokens"

/** Definición de columnas del header */
interface HeaderColumn {
  label: string
  width: number
  align: "center" | "left"
}


interface Props {
  /** Array de datos de pacientes para renderizar en la tabla */
  rows: PatientRowData[]
  header:HeaderColumn[]
  /** Altura máxima del contenedor con scroll (default: "calc(100vh - 160px)") */
  maxHeight?: string
}

/**
 * PatientTable
 *
 * TableContainer scrolleable con header sticky azul.
 * Filas alternadas cada 2 registros.
 * Filas con prioridad 1 tienen fondo sutil rojo.
 * Filas seleccionadas tienen borde izquierdo azul.
 */
export const PatientTable = ({ rows,header, maxHeight = "calc(100vh - 160px)" }: Props) => {
  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        border:       `1px solid ${emergencyTokens.colors.border}`,
        borderRadius: emergencyTokens.borderRadius.lg,
        overflow:     "auto",
        maxHeight,
        boxShadow:    emergencyTokens.shadows.table,
      }}
    >
      <Table stickyHeader size="small" sx={{ minWidth: 1100 }}>
        {/* ── Header sticky ── */}
        <TableHead>
          <TableRow>
            {header.map((col) => (
              <TableCell
                key={col.label}
                align={col.align}
                sx={{
                  width:    col.width,
                  minWidth: col.width,
                  height:   40,
                  padding:  "0 8px",
                  borderBottom: "none",
                  whiteSpace: "nowrap",

                  // Sticky header styles
                  backgroundColor: emergencyTokens.colors.tableHeaderBg,
                  color:           "#FFFFFF",
                  fontFamily:      emergencyTokens.typography.fontFamily,
                  fontSize:        emergencyTokens.typography.size.tableHeader,
                  fontWeight:      emergencyTokens.typography.weight.bold,
                  textTransform:   "uppercase",
                  letterSpacing:   "0.5px",

                  // MUI sticky header override
                  "&.MuiTableCell-stickyHeader": {
                    backgroundColor: emergencyTokens.colors.tableHeaderBg,
                  },
                }}
              >
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        {/* ── Body ── */}
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={header.length}
                sx={{
                  textAlign: "center",
                  height:    120,
                  borderBottom: "none",
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", color: emergencyTokens.colors.textSecondary }}>
                  <Typography sx={{ fontFamily: emergencyTokens.typography.fontFamily, fontSize: "14px", color: emergencyTokens.colors.textSecondary }}>
                    No hay pacientes en el Monitor de Emergencia
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <PatientRow
                key={row.id}
                data={row}
                isAlternate={index % 2 === 1}
              />
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
