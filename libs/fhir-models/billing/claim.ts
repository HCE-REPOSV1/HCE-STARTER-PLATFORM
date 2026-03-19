import { Reference } from '../common/reference'
import { CodeableConcept } from '../common/codeable-concept'

export interface Claim {
  resourceType: 'Claim'
  id: string
  status: string
  type: CodeableConcept
  patient: Reference
  encounter?: Reference
  total?: {
    value: number
  }
}