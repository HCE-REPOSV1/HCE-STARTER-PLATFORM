import { Identifier } from '../common/identifier'

export interface Organization {
  resourceType: 'Organization'
  id: string
  identifier?: Identifier[]
  active?: boolean
  name?: string
}