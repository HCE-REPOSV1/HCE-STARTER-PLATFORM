import { Reference } from '../common/reference'
import { CodeableConcept } from '../common/codeable-concept'

export interface Condition {
  resourceType: 'Condition'
  id: string
  clinicalStatus?: CodeableConcept
  verificationStatus?: CodeableConcept
  code: CodeableConcept
  subject: Reference
  encounter?: Reference
  onsetDateTime?: string
}