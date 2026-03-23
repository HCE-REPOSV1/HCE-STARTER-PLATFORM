  /**
 * ---------------------------------------------------------
 * Component: DSProvider (Design System Provider)
 * Author: Gregorovichz Carlos Rossi
 * Created: 09-03-2026
 * Description:
 * Proveedor principal del Design System encargado de
 * inicializar la configuración global de estilos de
 * Material UI en la aplicación.
 *
 * Responsabilidades:
 * - Inyectar el Theme corporativo en la aplicación
 * - Aplicar estilos base mediante CssBaseline
 * - Servir como wrapper raíz para todos los componentes UI
 *
 * Arquitectura:
 * Este provider se utiliza normalmente en el nivel raíz
 * del microfrontend o del shell en arquitecturas de
 * microfrontends.
 *
 * Ejemplo de uso:
 *
 * <DSProvider>
 *    <App />
 * </DSProvider>
 *
 * Beneficios:
 * - Consistencia visual entre microfrontends
 * - Centralización de estilos
 * - Escalabilidad del Design System
 *
 * Tecnologías:
 * - React
 * - TypeScript
 * - Material UI (MUI)
 * ---------------------------------------------------------
 */
  import { ThemeProvider } from "@mui/material/styles"
  import CssBaseline from "@mui/material/CssBaseline"
  import { theme } from "../theme/theme"
  import type { ReactNode } from "react"
/**
 * Props del DSProvider
 */
  interface Props {
  children: ReactNode
  }
  /**
   * Componentes hijos que heredarán el Theme del Design System
   */
  export const DSProvider = ({ children }: Props) => {
  /**
   * DSProvider
   *
   * Wrapper que aplica el Theme global del Design System
   * a todos los componentes hijos de la aplicación.
   */
  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline aplica un reset de estilos consistente entre navegadores */}
      <CssBaseline />
      {/* Renderiza la aplicación o microfrontend */}
      {children}
    </ThemeProvider>
  )
}