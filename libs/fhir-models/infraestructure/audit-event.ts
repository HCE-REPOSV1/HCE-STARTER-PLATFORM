import { Reference } from '../common/reference'

export interface AuditEvent {
  resourceType: 'AuditEvent'
  id: string
  type: string
  action: string
  recorded: string
  agent: {
    who: Reference
  }[]
}