// ─────────────────────────────────────────────────────────
// @jarvis/design-system — Public API
// ─────────────────────────────────────────────────────────

// ── Themes ────────────────────────────────────────────────
export { theme }          from "./theme/theme"
export { emergencyTheme } from "./theme/emergencyTheme"

// ── Provider ──────────────────────────────────────────────
export { DSProvider } from "./provider/ThemeProvider"

// ── Design Tokens — Emergency Monitor ─────────────────────
export {
  emergencyTokens,
  emergencyColors,
  emergencyTypography,
  emergencySpacing,
  emergencyBorderRadius,
  emergencyShadows,
  emergencyZIndex,
  emergencyTokensJSON,
  injectEmergencyTokens,
} from "./tokens/emergency.tokens"

// ── Atoms ─────────────────────────────────────────────────
export { Button }             from "./atoms/Button/Button"
export { PriorityBadge }      from "./atoms/PriorityBadge/PriorityBadge"
export { BoxBadge }           from "./atoms/BoxBadge/BoxBadge"
export { ClinicalStatusIcon } from "./atoms/ClinicalStatusIcon/ClinicalStatusIcon"
export { AttentionCode }      from "./atoms/AttentionCode/AttentionCode"
export { InfoButton }         from "./atoms/InfoButton/InfoButton"
export { ActionIconButton }   from "./atoms/ActionIconButton/ActionIconButton"

// ── Types — Atoms ──────────────────────────────────────────
export type { PriorityLevel }      from "./atoms/PriorityBadge/PriorityBadge"
export type { BoxStatus }          from "./atoms/BoxBadge/BoxBadge"
export type { ClinicalIconStatus } from "./atoms/ClinicalStatusIcon/ClinicalStatusIcon"

// ── Molecules ─────────────────────────────────────────────
export { Card }                  from "./molecules/Card/Card"
export { EmergencyHeader }       from "./molecules/EmergencyHeader/EmergencyHeader"
export { ActionBar }             from "./molecules/ActionBar/ActionBar"
export { PatientRow }            from "./molecules/PatientRow/PatientRow"
export { PatientTable }          from "./molecules/PatientTable/PatientTable"
export { EmergencyPagination }   from "./molecules/EmergencyPagination/EmergencyPagination"
export { BedsAvailabilityTab }   from "./molecules/BedsAvailabilityTab/BedsAvailabilityTab"

// ── Types — Molecules ──────────────────────────────────────
export type { PatientRowData } from "./molecules/PatientRow/PatientRow"
export type { ExtraAction }    from "./molecules/ActionBar/ActionBar"

// ── Jarvis UI — New Atoms ──────────────────────────────────
export { TextInput }   from "./atoms/TextInput/TextInput"
export { SelectInput } from "./atoms/SelectInput/SelectInput"
export { Checkbox }    from "./atoms/Checkbox/Checkbox"
export { StatusBadge } from "./atoms/StatusBadge/StatusBadge"

// ── Jarvis UI — New Molecules ──────────────────────────────
export { PageHeader }  from "./molecules/PageHeader/PageHeader"
export { DataTable }   from "./molecules/DataTable/DataTable"

// ── Types — New Atoms ──────────────────────────────────────
export type { BadgeVariant } from "./atoms/StatusBadge/StatusBadge"
