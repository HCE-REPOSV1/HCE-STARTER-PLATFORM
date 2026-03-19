export interface Bundle<T> {
  resourceType: 'Bundle'
  type: 'searchset'
  total: number
  entry: {
    resource: T
  }[]
}