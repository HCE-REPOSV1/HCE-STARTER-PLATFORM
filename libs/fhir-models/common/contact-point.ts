export interface ContactPoint {
  system?: 'phone' | 'email' | 'fax'
  value?: string
  use?: 'home' | 'work' | 'mobile'
}