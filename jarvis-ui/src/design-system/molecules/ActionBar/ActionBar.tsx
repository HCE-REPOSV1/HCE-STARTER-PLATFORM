/**
 * ---------------------------------------------------------
 * Component: ActionBar
 * Author: Design System - Emergency Monitor
 * Created: 09-03-2026
 * Description:
 * Barra de acciones rápidas para el módulo de emergencia.
 * Agrupa botones icon-only con separadores visuales entre grupos.
 *
 * Grupos predeterminados:
 *   Grupo 1: Filtrar, Usuario
 *   — separador —
 *   Grupo 2: Imprimir
 *
 * Uso básico (con handlers propios):
 *   <ActionBar onFilter={handleFilter} onPrint={handlePrint} />
 *
 * Uso con botones adicionales (extensible):
 *   <ActionBar onFilter={...} onPrint={...} extraActions={[...]} />
 * ---------------------------------------------------------
 */
import { Box, Divider } from "@mui/material"
import FilterListIcon       from "@mui/icons-material/FilterList"
import PersonOutlineIcon    from "@mui/icons-material/PersonOutline"
import PrintOutlinedIcon    from "@mui/icons-material/PrintOutlined"
import RefreshOutlinedIcon  from "@mui/icons-material/RefreshOutlined"
import { ActionIconButton } from "../../atoms/ActionIconButton/ActionIconButton"
import { emergencyTokens }  from "../../tokens/emergency.tokens"
import type { SvgIconComponent } from "@mui/icons-material"

/** Definición de un botón adicional personalizado */
export interface ExtraAction {
  icon:      SvgIconComponent
  tooltip:   string
  onClick?:  () => void
  disabled?: boolean
}

interface Props {
  onFilter?:    () => void
  onUser?:      () => void
  onRefresh?:   () => void
  onPrint?:     () => void
  /** Botones adicionales (aparecen después del separador principal) */
  extraActions?: ExtraAction[]
}

const separatorSx = {
  height:      "20px",
  mx:          "6px",
  borderColor: emergencyTokens.colors.border,
}

/**
 * ActionBar
 *
 * Barra horizontal con fondo blanco y borde inferior sutil.
 * Los botones tienen 32x32px con border-radius 4px.
 * Separadores verticales dividen grupos lógicos de acciones.
 */
export const ActionBar = ({
  onFilter,
  onUser,
  onRefresh,
  onPrint,
  extraActions = [],
}: Props) => {
  return (
    <Box
      sx={{
        display:         "flex",
        alignItems:      "center",
        gap:             "4px",
        padding:         `${emergencyTokens.spacing[2]} ${emergencyTokens.spacing[4]}`,
        backgroundColor: emergencyTokens.colors.surfaceBg,
        borderBottom:    `1px solid ${emergencyTokens.colors.border}`,
      }}
      role="toolbar"
      aria-label="Barra de acciones"
    >
      {/* Grupo 1: Filtros y usuario */}
      <ActionIconButton icon={FilterListIcon}    tooltip="Filtrar pacientes" onClick={onFilter} />
      <ActionIconButton icon={PersonOutlineIcon} tooltip="Gestión de usuario" onClick={onUser} />

      <Divider orientation="vertical" flexItem sx={separatorSx} />

      {/* Grupo 2: Utilidades */}
      <ActionIconButton icon={RefreshOutlinedIcon} tooltip="Actualizar lista" onClick={onRefresh} />
      <ActionIconButton icon={PrintOutlinedIcon}   tooltip="Imprimir" onClick={onPrint} />

      {/* Botones adicionales opcionales */}
      {extraActions.length > 0 && (
        <>
          <Divider orientation="vertical" flexItem sx={separatorSx} />
          {extraActions.map((action, idx) => (
            <ActionIconButton
              key={idx}
              icon={action.icon}
              tooltip={action.tooltip}
              onClick={action.onClick}
              disabled={action.disabled}
            />
          ))}
        </>
      )}
    </Box>
  )
}
