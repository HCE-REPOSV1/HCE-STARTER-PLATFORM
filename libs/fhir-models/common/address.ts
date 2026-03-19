export interface Address {
  use?: 'home' | 'work'
  line?: string[]
  city?: string
  district?: string
  state?: string
  postalCode?: string
  country?: string
}