import { Reference } from '../common/reference'

export interface Coverage {
  resourceType: 'Coverage'
  id: string
  beneficiary: Reference
  payer: Reference[]
  policyHolder?: Reference
}