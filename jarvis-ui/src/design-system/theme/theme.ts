/**
 * ---------------------------------------------------------
 * File: theme.ts
 * Author: Gregorovichz Carlos Rossi
 * Created: 09-03-2026
 * Description:
 * Definición del tema global de la aplicación utilizando
 * Material UI (MUI). Este archivo centraliza los estilos
 * visuales del Design System, permitiendo mantener
 * consistencia visual en todos los microfrontends.
 *
 * Responsabilidades:
 * - Definir la paleta de colores corporativa
 * - Configurar tipografía global
 * - Estandarizar estilos de componentes MUI
 * - Mantener consistencia visual entre aplicaciones
 *
 * Arquitectura:
 * Este theme es consumido por el ThemeProvider en el
 * microfrontend shell o en cada microfrontend.
 *
 * Ejemplo de uso:
 *
 * import { ThemeProvider } from "@mui/material/styles"
 * import { theme } from "./theme"
 *
 * <ThemeProvider theme={theme}>
 *    <App />
 * </ThemeProvider>
 *
 * Tecnologías:
 * - React
 * - Material UI (MUI v5+)
 * - TypeScript
 * ---------------------------------------------------------
 */
import { createTheme } from "@mui/material/styles"
/**
 * Theme principal del Design System
 */
export const theme = createTheme({
  /**
   * Paleta de colores corporativa
   */
  palette: {
    /**
     * Color primario de la marca
     */
    primary: {
      main: "#1E4FA3"
    },
    /**
     * Colores secundarios utilizados en botones
     * acciones positivas y elementos destacados
     */
    secondary: {
      main: "#6FB23F",
      light: "#8BCB5A",
      dark: "#5AA12E",
      contrastText: "#ffffff"
    },
    /**
     * Color de fondo general de la aplicación
     */
    background: {
      default: "#F7F9FC"
    }

  },
  /**
   * Configuración global de bordes
   */
  shape: {
    borderRadius: 8
  },
  /**
   * Tipografía corporativa
   */
  typography: {
    /**
     * Fuente base del sistema
     */
    fontFamily: "Roboto",
    /**
     * Estilo para encabezados principales
     */
    h1: {
      fontSize: "28px",
      fontWeight: 600
    }
  },
  /**
   * Personalización de componentes de Material UI
   * para alinearlos con el Design System
   */
  components: {
    /**
     * Override global del componente Button
     */
    MuiButton: {
      styleOverrides: {
        /**
         * Estilo base aplicado a todos los botones
         */
        root: {
          borderRadius: 8,
          textTransform: "none" // evita uppercase automático
        }
      }
    }
  }

})