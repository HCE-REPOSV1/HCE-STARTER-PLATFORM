/**
 * ---------------------------------------------------------
 * Component: EmergencyPagination
 * Author: Design System - Emergency Monitor
 * Created: 09-03-2026
 * Description:
 * Componente de paginación alineado a la derecha para la
 * tabla de pacientes del Monitor de Emergencia.
 *
 * Elementos:
 *   [N items] [← prev] [1] [2] [3] [next →]
 *
 * Estados de página:
 *   activa   → fondo #2B5BA8, texto blanco
 *   inactiva → fondo blanco, hover azul claro
 *   prev/next deshabilitado → opacidad 40%
 *
 * Uso:
 *   <EmergencyPagination
 *     totalItems={127}
 *     currentPage={2}
 *     totalPages={13}
 *     onPageChange={(page) => setCurrentPage(page)}
 *   />
 * ---------------------------------------------------------
 */
import { Box, Chip, IconButton, Typography } from "@mui/material"
import ChevronLeftIcon  from "@mui/icons-material/ChevronLeft"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import { emergencyTokens } from "../../tokens/emergency.tokens"

interface Props {
  /** Número total de registros */
  totalItems:   number
  /** Página actualmente activa (1-based) */
  currentPage:  number
  /** Número total de páginas */
  totalPages:   number
  /** Callback al cambiar de página */
  onPageChange: (page: number) => void
  /** Máximo de páginas visibles a ambos lados de la página actual (default: 2) */
  siblingCount?: number
}

/** Genera el array de páginas visibles con "..." cuando corresponde */
function buildPageRange(current: number, total: number, siblings: number): (number | "...")[] {
  if (total <= siblings * 2 + 5) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | "...")[] = [1]
  const rangeStart = Math.max(2, current - siblings)
  const rangeEnd   = Math.min(total - 1, current + siblings)

  if (rangeStart > 2)       pages.push("...")
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i)
  if (rangeEnd < total - 1) pages.push("...")
  pages.push(total)

  return pages
}

const navButtonSx = {
  width:           28,
  height:          28,
  borderRadius:    "50%",
  border:          `1px solid ${emergencyTokens.colors.border}`,
  backgroundColor: "#FFFFFF",
  color:           emergencyTokens.colors.textSecondary,
  padding:         0,
  "&:hover:not(.Mui-disabled)": {
    backgroundColor: emergencyTokens.colors.hoverBg,
    borderColor:     emergencyTokens.colors.tableHeaderBg,
    color:           emergencyTokens.colors.tableHeaderBg,
  },
  "&.Mui-disabled": { opacity: 0.4 },
}

/**
 * EmergencyPagination
 *
 * Paginación alineada a la derecha.
 * Chip de total de items, botones prev/next con flechas,
 * botones de página (activo en azul, inactivo en blanco).
 */
export const EmergencyPagination = ({
  totalItems,
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 2,
}: Props) => {
  const pages = buildPageRange(currentPage, totalPages, siblingCount)

  return (
    <Box
      sx={{
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "flex-end",
        gap:             "6px",
        padding:         `${emergencyTokens.spacing[3]} ${emergencyTokens.spacing[4]}`,
      }}
      role="navigation"
      aria-label="Paginación de pacientes"
    >
      {/* Total de items */}
      <Chip
        label={`${totalItems} pacientes`}
        size="small"
        sx={{
          backgroundColor: emergencyTokens.colors.rowAlternate,
          color:           emergencyTokens.colors.textPrimary,
          fontFamily:      emergencyTokens.typography.fontFamily,
          fontSize:        "12px",
          fontWeight:      emergencyTokens.typography.weight.medium,
          height:          26,
          borderRadius:    emergencyTokens.borderRadius.sm,
          border:          `1px solid ${emergencyTokens.colors.border}`,
          marginRight:     "8px",
          "& .MuiChip-label": { padding: "0 10px" },
        }}
      />

      {/* Botón anterior */}
      <IconButton
        size="small"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        sx={navButtonSx}
        aria-label="Página anterior"
      >
        <ChevronLeftIcon sx={{ fontSize: 16 }} />
      </IconButton>

      {/* Páginas */}
      {pages.map((page, idx) =>
        page === "..." ? (
          <Typography
            key={`ellipsis-${idx}`}
            sx={{
              fontFamily: emergencyTokens.typography.fontFamily,
              fontSize:   "12px",
              color:      emergencyTokens.colors.textSecondary,
              userSelect: "none",
              padding:    "0 2px",
            }}
          >
            …
          </Typography>
        ) : (
          <IconButton
            key={page}
            size="small"
            onClick={() => onPageChange(page)}
            sx={{
              width:           28,
              height:          28,
              borderRadius:    emergencyTokens.borderRadius.sm,
              border:          `1px solid ${page === currentPage ? emergencyTokens.colors.tableHeaderBg : emergencyTokens.colors.border}`,
              backgroundColor: page === currentPage ? emergencyTokens.colors.tableHeaderBg : "#FFFFFF",
              color:           page === currentPage ? "#FFFFFF" : emergencyTokens.colors.textSecondary,
              fontFamily:      emergencyTokens.typography.fontFamily,
              fontSize:        "12px",
              fontWeight:      page === currentPage ? emergencyTokens.typography.weight.bold : emergencyTokens.typography.weight.regular,
              padding:         0,
              "&:hover": {
                backgroundColor: page === currentPage ? emergencyTokens.colors.headerBg : emergencyTokens.colors.hoverBg,
                borderColor:     page === currentPage ? emergencyTokens.colors.headerBg : emergencyTokens.colors.tableHeaderBg,
              },
            }}
            aria-label={`Página ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </IconButton>
        )
      )}

      {/* Botón siguiente */}
      <IconButton
        size="small"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        sx={navButtonSx}
        aria-label="Página siguiente"
      >
        <ChevronRightIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  )
}
