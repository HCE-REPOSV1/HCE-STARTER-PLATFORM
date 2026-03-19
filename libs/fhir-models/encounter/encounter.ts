import { Reference } from '../common/reference'
import { Period } from '../common/period'

export interface Encounter {
  resourceType: 'Encounter'
  id: string
  status: 'planned' | 'in-progress' | 'finished' | 'cancelled'
  class: string
  subject: Reference
  period?: Period
}