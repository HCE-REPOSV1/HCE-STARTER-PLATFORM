import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuthService {
  private readonly configPath = path.join(process.cwd(), 'config', 'security.json');

  login(username: string, password: string) {
    const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
    const user = config.users.find(
      (u: any) => u.username === username && u.password === password,
    );
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    return { success: true, username };
  }
}
