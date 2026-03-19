import { Identifier } from '../common/identifier'
import { HumanName } from '../common/human-name'

export interface Practitioner {
  resourceType: 'Practitioner'
  id: string
  identifier?: Identifier[]
  active?: boolean
  name?: HumanName[]
}