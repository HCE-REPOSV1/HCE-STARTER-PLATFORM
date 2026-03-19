import { Reference } from '../common/reference'

export interface Appointment {
  resourceType: 'Appointment'
  id: string
  status: 'booked' | 'cancelled' | 'fulfilled'
  start?: string
  end?: string
  participant: {
    actor: Reference
    status: string
  }[]
}