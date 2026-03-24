export type UserRole = 'ADMIN' | 'DEV';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}
