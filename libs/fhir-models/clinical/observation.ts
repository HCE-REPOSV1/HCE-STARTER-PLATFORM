import { Reference } from '../common/reference'
import { CodeableConcept } from '../common/codeable-concept'
import { Quantity } from '../common/quantity'

export interface Observation {
  resourceType: 'Observation'
  id: string
  status: 'registered' | 'preliminary' | 'final'
  code: CodeableConcept
  subject: Reference
  encounter?: Reference
  effectiveDateTime?: string
  valueQuantity?: Quantity
  valueString?: string
}