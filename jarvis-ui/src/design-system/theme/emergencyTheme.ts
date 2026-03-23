/**
 * ---------------------------------------------------------
 * File: theme/emergencyTheme.ts
 * Author: Design System - Emergency Monitor
 * Created: 09-03-2026
 * Description:
 * Tema MUI extendido para el módulo Monitor de Emergencia.
 * Hereda el theme base de @jarvis/design-system y sobreescribe
 * los tokens con los valores específicos del módulo clínico.
 *
 * Uso:
 * import { emergencyTheme } from '@jarvis/design-system'
 *
 * <ThemeProvider theme={emergencyTheme}>
 *   <EmergencyMonitorApp />
 * </ThemeProvider>
 * ---------------------------------------------------------
 */
import { createTheme } from "@mui/material/styles"
import { theme } from "./theme"
import { emergencyColors, emergencyTypography } from "../tokens/emergency.tokens"

export const emergencyTheme = createTheme(theme, {
  /**
   * Tipografía IBM Plex Sans para el contexto médico/técnico
   */
  typography: {
    fontFamily: emergencyTypography.fontFamily,
    h1: {
      fontSize: emergencyTypography.size.headerTitle,
      fontWeight: emergencyTypography.weight.bold,
    },
    h2: {
      fontSize: "16px",
      fontWeight: emergencyTypography.weight.semibold,
    },
    body1: {
      fontSize: emergencyTypography.size.tableCell,
      fontWeight: emergencyTypography.weight.regular,
      color: emergencyColors.textPrimary,
    },
    body2: {
      fontSize: emergencyTypography.size.tableCell,
      fontWeight: emergencyTypography.weight.regular,
      color: emergencyColors.textSecondary,
    },
    caption: {
      fontSize: emergencyTypography.size.tableHeader,
      fontWeight: emergencyTypography.weight.bold,
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
  },

  /**
   * Paleta de colores del módulo de emergencia
   */
  palette: {
    primary: {
      main:          emergencyColors.tableHeaderBg,
      dark:          emergencyColors.headerBg,
      light:         emergencyColors.hoverBg,
      contrastText:  "#FFFFFF",
    },
    secondary: {
      main:          emergencyColors.priority3,  // verde activo
      contrastText:  "#FFFFFF",
    },
    error: {
      main:  emergencyColors.priority1,  // rojo crítico
    },
    warning: {
      main:  emergencyColors.priority2,  // naranja urgente
    },
    success: {
      main:  emergencyColors.priority3,  // verde moderado
    },
    info: {
      main:  emergencyColors.priority4,  // azul leve
    },
    background: {
      default: emergencyColors.surfaceBg,
      paper:   emergencyColors.surfaceBg,
    },
    divider: emergencyColors.border,
    text: {
      primary:   emergencyColors.textPrimary,
      secondary: emergencyColors.textSecondary,
    },
  },

  /**
   * Bordes redondeados consistentes
   */
  shape: {
    borderRadius: 6,
  },

  /**
   * Overrides de componentes MUI para el módulo de emergencia
   */
  components: {
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontFamily: emergencyTypography.fontFamily,
          fontSize:   emergencyTypography.size.tableCell,
          color:      emergencyColors.textPrimary,
          borderBottom: "none",
          padding: "0 8px",
          height: "44px",
        },
        head: {
          backgroundColor: emergencyColors.tableHeaderBg,
          color:           "#FFFFFF",
          fontSize:        emergencyTypography.size.tableHeader,
          fontWeight:      emergencyTypography.weight.bold,
          textTransform:   "uppercase",
          letterSpacing:   "0.5px",
          height:          "40px",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          height: "44px",
          borderBottom: `1px solid #E2EAF4`,
          transition: "background-color 0.15s ease",
          "&:hover": {
            backgroundColor: emergencyColors.hoverBg,
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontFamily:  emergencyTypography.fontFamily,
          fontSize:    "12px",
          fontWeight:  emergencyTypography.weight.medium,
          backgroundColor: emergencyColors.headerBg,
          borderRadius: "4px",
          padding: "4px 8px",
        },
        arrow: {
          color: emergencyColors.headerBg,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: emergencyTypography.fontFamily,
          borderRadius: "4px",
        },
      },
    },
  },
})
