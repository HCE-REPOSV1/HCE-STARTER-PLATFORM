/**
 * ---------------------------------------------------------
 * File: tokens/emergency.tokens.ts
 * Author: Design System - Emergency Monitor
 * Created: 09-03-2026
 * Description:
 * Design Tokens del módulo Monitor de Emergencia.
 * Centraliza todos los valores visuales del módulo:
 * colores, tipografía, espaciado, bordes, sombras y z-index.
 *
 * Uso como constantes TypeScript:
 *   import { emergencyTokens } from '@jarvis/design-system'
 *
 * Uso como CSS Variables (inyectar en :root):
 *   import { injectEmergencyTokens } from '@jarvis/design-system'
 *   injectEmergencyTokens() // llamar en el entry point del módulo
 *
 * Uso como JSON para Design Tokens externos:
 *   export { emergencyTokensJSON }
 * ---------------------------------------------------------
 */

// ─────────────────────────────────────────────────────────
// TOKENS DE COLOR
// ─────────────────────────────────────────────────────────
export const emergencyColors = {
  // Base
  headerBg:        '#1A3A6B', // Azul marino institucional — header principal
  surfaceBg:       '#FFFFFF', // Fondo de superficies / tabla
  tableHeaderBg:   '#2B5BA8', // Azul medio — encabezado de tabla
  rowAlternate:    '#F4F7FB', // Fila alterna de tabla
  border:          '#D0DBF0', // Bordes y divisores
  hoverBg:         '#EEF2F9', // Fondo hover de fila / botón
  rowPriority1Bg:  '#FFF5F5', // Fondo sutil para filas críticas

  // Textos
  textPrimary:     '#1C2B4A',
  textSecondary:   '#5A6A85',

  // Sistema de prioridades
  priority1:       '#E53E3E', // Crítico
  priority2:       '#F6A623', // Urgente
  priority3:       '#27AE60', // Moderado
  priority4:       '#3498DB', // Leve
  priorityNone:    '#B0BEC5', // Sin prioridad

  // Estados de Box / Sala
  boxActive:       '#27AE60', // Sala activa
  boxUrgent:       '#E53E3E', // Urgente/crítico
  boxWaiting:      '#8A9BB0', // En espera / sin asignar
  boxTP:           '#5A6A85', // Tópico (TP)

  // Iconos de estado clínico
  iconAlert:       '#F6A623', // Pendiente / alerta
  iconAlertBg:     '#FFF3E0',
  iconOk:          '#27AE60', // Completado / normal
  iconOkBg:        '#E8F5E9',
  iconUrgent:      '#E53E3E', // Urgente
  iconUrgentBg:    '#FFEBEE',
  iconInactive:    '#B0BEC5', // Inactivo — opacidad 40%
} as const

// ─────────────────────────────────────────────────────────
// TOKENS DE TIPOGRAFÍA
// ─────────────────────────────────────────────────────────
export const emergencyTypography = {
  fontFamily:      '"IBM Plex Sans", "Roboto", system-ui, sans-serif',
  fontFamilyMono:  '"IBM Plex Mono", "Roboto Mono", "Courier New", monospace',

  // Escalas de tamaño
  size: {
    headerTitle:  '20px',
    headerMeta:   '13px',
    tableHeader:  '12px',
    tableCell:    '13px',
    badge:        '11px',
  },

  // Pesos
  weight: {
    regular:    400,
    medium:     500,
    semibold:   600,
    bold:       700,
    extrabold:  800,
  },

  // Estilos predefinidos por rol semántico
  styles: {
    headerTitle:  { fontSize: '20px', fontWeight: 700, color: '#FFFFFF' },
    headerMeta:   { fontSize: '13px', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.3px' },
    tableHeader:  { fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
    tableCell:    { fontSize: '13px', fontWeight: 400 },
    tableCellName:{ fontSize: '13px', fontWeight: 600 },
    badgePriority:{ fontSize: '11px', fontWeight: 800 },
    badgeBox:     { fontSize: '11px', fontWeight: 700 },
  },
} as const

// ─────────────────────────────────────────────────────────
// TOKENS DE ESPACIADO (grid base 4px)
// ─────────────────────────────────────────────────────────
export const emergencySpacing = {
  base: 4,
  1:  '4px',
  2:  '8px',
  3:  '12px',
  4:  '16px',
  5:  '20px',
  6:  '24px',
  8:  '32px',
  10: '40px',
  12: '48px',
} as const

// ─────────────────────────────────────────────────────────
// TOKENS DE BORDER-RADIUS
// ─────────────────────────────────────────────────────────
export const emergencyBorderRadius = {
  none:   '0px',
  sm:     '4px',   // Botones de acción
  md:     '6px',   // Badges de box / iconos clínicos
  lg:     '8px',   // Cards, tab lateral
  pill:   '50px',  // Chips
  circle: '50%',   // Badges de prioridad, botón info
} as const

// ─────────────────────────────────────────────────────────
// TOKENS DE SOMBRA
// ─────────────────────────────────────────────────────────
export const emergencyShadows = {
  header: '0 2px 8px rgba(26, 58, 107, 0.15)',
  table:  '0 2px 12px rgba(26, 58, 107, 0.08)',
  card:   '0 1px 4px rgba(0, 0, 0, 0.08)',
  tab:    '-2px 0 8px rgba(26, 58, 107, 0.20)',
} as const

// ─────────────────────────────────────────────────────────
// TOKENS DE Z-INDEX
// ─────────────────────────────────────────────────────────
export const emergencyZIndex = {
  stickyHeader: 100,
  sideTab:      200,
  tooltip:      300,
  modal:        400,
} as const

// ─────────────────────────────────────────────────────────
// OBJETO UNIFICADO
// ─────────────────────────────────────────────────────────
export const emergencyTokens = {
  colors:       emergencyColors,
  typography:   emergencyTypography,
  spacing:      emergencySpacing,
  borderRadius: emergencyBorderRadius,
  shadows:      emergencyShadows,
  zIndex:       emergencyZIndex,
} as const

// ─────────────────────────────────────────────────────────
// JSON PARA HERRAMIENTAS DE DESIGN TOKENS
// (Style Dictionary, Theo, Token Transformer, etc.)
// ─────────────────────────────────────────────────────────
export const emergencyTokensJSON = {
  color: {
    base: {
      'header-bg':       { value: emergencyColors.headerBg,       category: 'color' },
      'surface-bg':      { value: emergencyColors.surfaceBg,      category: 'color' },
      'table-header-bg': { value: emergencyColors.tableHeaderBg,  category: 'color' },
      'row-alternate':   { value: emergencyColors.rowAlternate,   category: 'color' },
      'border':          { value: emergencyColors.border,         category: 'color' },
      'hover-bg':        { value: emergencyColors.hoverBg,        category: 'color' },
      'row-priority1-bg':{ value: emergencyColors.rowPriority1Bg, category: 'color' },
      'text-primary':    { value: emergencyColors.textPrimary,    category: 'color' },
      'text-secondary':  { value: emergencyColors.textSecondary,  category: 'color' },
    },
    priority: {
      '1-critical': { value: emergencyColors.priority1,    category: 'color', comment: 'Crítico' },
      '2-urgent':   { value: emergencyColors.priority2,    category: 'color', comment: 'Urgente' },
      '3-moderate': { value: emergencyColors.priority3,    category: 'color', comment: 'Moderado' },
      '4-mild':     { value: emergencyColors.priority4,    category: 'color', comment: 'Leve' },
      'none':       { value: emergencyColors.priorityNone, category: 'color', comment: 'Sin prioridad' },
    },
    box: {
      'active':  { value: emergencyColors.boxActive,  category: 'color' },
      'urgent':  { value: emergencyColors.boxUrgent,  category: 'color' },
      'waiting': { value: emergencyColors.boxWaiting, category: 'color' },
      'tp':      { value: emergencyColors.boxTP,      category: 'color' },
    },
    clinical: {
      'icon-alert':     { value: emergencyColors.iconAlert,     category: 'color' },
      'icon-alert-bg':  { value: emergencyColors.iconAlertBg,   category: 'color' },
      'icon-ok':        { value: emergencyColors.iconOk,        category: 'color' },
      'icon-ok-bg':     { value: emergencyColors.iconOkBg,      category: 'color' },
      'icon-urgent':    { value: emergencyColors.iconUrgent,    category: 'color' },
      'icon-urgent-bg': { value: emergencyColors.iconUrgentBg,  category: 'color' },
      'icon-inactive':  { value: emergencyColors.iconInactive,  category: 'color' },
    },
  },
  typography: {
    'font-family':      { value: emergencyTypography.fontFamily,     category: 'font' },
    'font-family-mono': { value: emergencyTypography.fontFamilyMono, category: 'font' },
  },
  spacing: {
    base: { value: '4px', category: 'size', comment: 'Grid base 4px' },
  },
} as const

// ─────────────────────────────────────────────────────────
// INYECTOR DE CSS CUSTOM PROPERTIES (:root)
// ─────────────────────────────────────────────────────────

/**
 * Inyecta todas las variables CSS del módulo de emergencia
 * en el elemento :root del documento.
 *
 * Llamar una vez en el entry point del microfrontend de emergencias.
 *
 * @example
 * // main.tsx
 * import { injectEmergencyTokens } from '@jarvis/design-system'
 * injectEmergencyTokens()
 */
export function injectEmergencyTokens(): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const c = emergencyColors

  // Base
  root.style.setProperty('--em-header-bg',        c.headerBg)
  root.style.setProperty('--em-surface-bg',        c.surfaceBg)
  root.style.setProperty('--em-table-header-bg',   c.tableHeaderBg)
  root.style.setProperty('--em-row-alternate',     c.rowAlternate)
  root.style.setProperty('--em-border',            c.border)
  root.style.setProperty('--em-hover-bg',          c.hoverBg)
  root.style.setProperty('--em-row-p1-bg',         c.rowPriority1Bg)
  root.style.setProperty('--em-text-primary',      c.textPrimary)
  root.style.setProperty('--em-text-secondary',    c.textSecondary)

  // Prioridades
  root.style.setProperty('--em-priority-1',        c.priority1)
  root.style.setProperty('--em-priority-2',        c.priority2)
  root.style.setProperty('--em-priority-3',        c.priority3)
  root.style.setProperty('--em-priority-4',        c.priority4)
  root.style.setProperty('--em-priority-none',     c.priorityNone)

  // Box / Sala
  root.style.setProperty('--em-box-active',        c.boxActive)
  root.style.setProperty('--em-box-urgent',        c.boxUrgent)
  root.style.setProperty('--em-box-waiting',       c.boxWaiting)
  root.style.setProperty('--em-box-tp',            c.boxTP)

  // Iconos clínicos
  root.style.setProperty('--em-icon-alert',        c.iconAlert)
  root.style.setProperty('--em-icon-alert-bg',     c.iconAlertBg)
  root.style.setProperty('--em-icon-ok',           c.iconOk)
  root.style.setProperty('--em-icon-ok-bg',        c.iconOkBg)
  root.style.setProperty('--em-icon-urgent',       c.iconUrgent)
  root.style.setProperty('--em-icon-urgent-bg',    c.iconUrgentBg)

  // Tipografía
  root.style.setProperty('--em-font-family',       emergencyTypography.fontFamily)
  root.style.setProperty('--em-font-family-mono',  emergencyTypography.fontFamilyMono)
}
