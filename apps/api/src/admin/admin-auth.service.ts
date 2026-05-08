import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { count, eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { DrizzleService } from '../db/drizzle.service';
import { platformAdmin } from '../db/schema/platform-admin';
import type { PlatformJwtPayload } from './platform-jwt-payload';
import type { AdminLoginDto } from './dto/admin-login.dto';
import type { BootstrapAdminDto } from './dto/bootstrap-admin.dto';

@Injectable()
export class AdminAuthService {
  constructor(private readonly drizzle: DrizzleService) {}

  async login(dto: AdminLoginDto) {
    const email = dto.email.trim().toLowerCase();
    const [row] = await this.drizzle.db
      .select()
      .from(platformAdmin)
      .where(eq(platformAdmin.email, email))
      .limit(1);

    if (!row?.ativo) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const ok = await bcrypt.compare(dto.senha, row.senhaHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const secret = process.env.PLATFORM_JWT_SECRET?.trim();
    if (!secret) {
      throw new UnauthorizedException('Plataforma não configurada');
    }

    const payload: PlatformJwtPayload = {
      sub: row.id,
      typ: 'platform',
      email: row.email,
    };

    const accessToken = jwt.sign(
      payload,
      secret,
      {
        expiresIn: (process.env.PLATFORM_JWT_EXPIRES_IN ?? '8h') as SignOptions['expiresIn'],
      } satisfies jwt.SignOptions,
    );

    return {
      accessToken,
      admin: { id: row.id, email: row.email, nome: row.nome },
    };
  }

  async bootstrap(dto: BootstrapAdminDto) {
    const expected = process.env.PLATFORM_BOOTSTRAP_SECRET?.trim();
    if (!expected || dto.secret !== expected) {
      throw new UnauthorizedException();
    }

    const [cnt] = await this.drizzle.db
      .select({ n: count() })
      .from(platformAdmin);

    if ((cnt?.n ?? 0) > 0) {
      throw new BadRequestException('Já existe administrador da plataforma.');
    }

    const email = dto.email.trim().toLowerCase();
    const senhaHash = await bcrypt.hash(dto.senha, 10);
    const [row] = await this.drizzle.db
      .insert(platformAdmin)
      .values({
        email,
        senhaHash,
        nome: dto.nome.trim(),
      })
      .returning();

    return { ok: true, id: row?.id, email: row?.email };
  }
}
