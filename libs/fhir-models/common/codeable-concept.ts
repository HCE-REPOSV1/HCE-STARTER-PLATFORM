import { Coding } from './coding'

export interface CodeableConcept {
  coding?: Coding[]
  text?: string
}