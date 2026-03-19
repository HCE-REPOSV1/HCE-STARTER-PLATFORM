// users.service.ts — CRUD de usuarios con roles (ADMIN, DEV)
// Persiste en config/users.json. Evolución futura: migrar a DB.
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export type UserRole = 'ADMIN' | 'DEV';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

@Injectable()
export class UsersService {
  private readonly filePath = path.join(process.cwd(), 'config', 'users.json');

  private read(): User[] {
    if (!fs.existsSync(this.filePath)) {
      // Seed default admin on first run
      const seed: User[] = [{ id: uuidv4(), username: 'admin', password: 'admin123', role: 'ADMIN', active: true, createdAt: new Date().toISOString() }];
      this.write(seed);
      return seed;
    }
    return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
  }

  private write(data: User[]) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  findAll(): Omit<User, 'password'>[] {
    return this.read().map(({ password: _p, ...u }) => u);
  }

  findOne(id: string): User {
    const u = this.read().find((x) => x.id === id);
    if (!u) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return u;
  }

  findByUsername(username: string): User | undefined {
    return this.read().find((u) => u.username === username);
  }

  create(dto: { username: string; password: string; role: UserRole }): Omit<User, 'password'> {
    const list = this.read();
    if (list.find((u) => u.username === dto.username)) throw new ConflictException('El usuario ya existe');
    const user: User = { id: uuidv4(), ...dto, active: true, createdAt: new Date().toISOString() };
    list.push(user);
    this.write(list);
    const { password: _p, ...safe } = user;
    return safe;
  }

  update(id: string, dto: Partial<Pick<User, 'password' | 'role' | 'active'>>): Omit<User, 'password'> {
    const list = this.read();
    const idx = list.findIndex((u) => u.id === id);
    if (idx === -1) throw new NotFoundException(`Usuario ${id} no encontrado`);
    list[idx] = { ...list[idx], ...dto };
    this.write(list);
    const { password: _p, ...safe } = list[idx];
    return safe;
  }

  remove(id: string) {
    const list = this.read().filter((u) => u.id !== id);
    this.write(list);
    return { deleted: true };
  }
}
