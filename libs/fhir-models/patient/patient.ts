import { Identifier } from '../common/identifier'
import { HumanName } from '../common/human-name'
import { ContactPoint } from '../common/contact-point'
import { Address } from '../common/address'

export interface Patient {
  resourceType: 'Patient'
  id: string
  identifier?: Identifier[]
  active?: boolean
  name?: HumanName[]
  telecom?: ContactPoint[]
  gender?: 'male' | 'female' | 'other' | 'unknown'
  birthDate?: string
  address?: Address[]
}