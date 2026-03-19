import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface EntityField {
  name: string;
  type: string;
  required: boolean;
}

export interface DomainEntity {
  name: string;
  fields: EntityField[];
}

export interface Domain {
  id: string;
  name: string;
  entities: DomainEntity[];
  datasourceId?: string;
}

@Injectable()
export class DomainsService {
  private readonly filePath = path.join(process.cwd(), 'config', 'domains.json');

  private read(): Domain[] {
    if (!fs.existsSync(this.filePath)) return [];
    const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
    // Migrate legacy format: entities was string[] → normalize to DomainEntity[]
    return raw.map((d: any) => ({
      ...d,
      entities: (d.entities ?? []).map((e: any) =>
        typeof e === 'string'
          ? { name: e, fields: [{ name: 'id', type: 'string', required: true }] }
          : e,
      ),
    }));
  }

  private write(data: Domain[]) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  findAll(): Domain[] {
    return this.read();
  }

  findOne(id: string): Domain {
    const d = this.read().find((x) => x.id === id);
    if (!d) throw new NotFoundException(`Domain ${id} no encontrado`);
    return d;
  }

  create(dto: Omit<Domain, 'id'>): Domain {
    const list = this.read();
    const item: Domain = { id: uuidv4(), ...dto };
    list.push(item);
    this.write(list);
    return item;
  }

  update(id: string, dto: Partial<Omit<Domain, 'id'>>): Domain {
    const list = this.read();
    const idx = list.findIndex((d) => d.id === id);
    if (idx === -1) throw new NotFoundException(`Domain ${id} no encontrado`);
    list[idx] = { ...list[idx], ...dto };
    this.write(list);
    return list[idx];
  }

  remove(id: string) {
    const list = this.read().filter((d) => d.id !== id);
    this.write(list);
    return { deleted: true };
  }
}
