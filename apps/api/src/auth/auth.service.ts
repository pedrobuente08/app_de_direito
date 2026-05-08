import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { Response } from 'express';
import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { COOKIE_ACCESS, COOKIE_REFRESH } from '../common/constants';
import { DrizzleService } from '../db/drizzle.service';
import { escritorio } from '../db/schema/escritorio';
import { passwordResetToken } from '../db/schema/password-reset-token';
import { refreshTokens } from '../db/schema/refresh-token';
import { usuario } from '../db/schema/usuario';
import { MailService } from '../mail/mail.service';
import type { CadastroEscritorioDto } from './dto/cadastro-escritorio.dto';
import { hashToken } from './auth-hash';
import type { AccessJwtPayload } from './jwt-payload';

const isProd = process.env.NODE_ENV === 'production';

@Injectable()
export class AuthService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly jwtService: JwtService,
    private readonly mail: MailService,
  ) {}

  setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const accessMs = 15 * 60 * 1000;
    const refreshMs = 7 * 24 * 60 * 60 * 1000;
    res.cookie(COOKIE_ACCESS, accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: accessMs,
      path: '/',
    });
    res.cookie(COOKIE_REFRESH, refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: refreshMs,
      path: '/',
    });
  }

  clearAuthCookies(res: Response) {
    res.clearCookie(COOKIE_ACCESS, { path: '/' });
    res.clearCookie(COOKIE_REFRESH, { path: '/' });
  }

  async login(email: string, senha: string) {
    const db = this.drizzle.db;
    const found = await db
      .select()
      .from(usuario)
      .where(and(eq(usuario.email, email.toLowerCase()), eq(usuario.ativo, true)))
      .limit(1);

    const row = found[0];
    if (!row) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const ok = await bcrypt.compare(senha, row.senhaHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.emitAuthTokens(row);
  }

  private async emitAuthTokens(row: {
    id: string;
    escritorioId: string;
    perfil: AccessJwtPayload['perfil'];
    email: string;
    nome: string | null;
  }) {
    const db = this.drizzle.db;

    const accessPayload: AccessJwtPayload = {
      sub: row.id,
      escritorioId: row.escritorioId,
      perfil: row.perfil,
      email: row.email,
    };

    const accessToken = this.jwtService.sign(accessPayload);

    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET não configurado');
    }

    const refreshExpires = (process.env.JWT_REFRESH_EXPIRES_IN ??
      '7d') as SignOptions['expiresIn'];

    const refreshToken = jwt.sign(
      {
        sub: row.id,
        escritorioId: row.escritorioId,
        perfil: row.perfil,
        email: row.email,
      },
      refreshSecret,
      { expiresIn: refreshExpires } satisfies jwt.SignOptions,
    );

    const decoded = jwt.decode(refreshToken) as jwt.JwtPayload;
    const expiresAt = new Date((decoded.exp ?? 0) * 1000);

    await db.insert(refreshTokens).values({
      usuarioId: row.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
      revogado: false,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: row.id,
        nome: row.nome,
        email: row.email,
        perfil: row.perfil,
        escritorioId: row.escritorioId,
      },
    };
  }

  async cadastrarEscritorio(dto: CadastroEscritorioDto) {
    const db = this.drizzle.db;
    const email = dto.email.toLowerCase().trim();

    const dupMail = await db
      .select({ id: usuario.id })
      .from(usuario)
      .where(eq(usuario.email, email))
      .limit(1);

    if (dupMail.length) {
      throw new ConflictException('Este e-mail já está cadastrado');
    }

    let cnpjValue: string | null = null;
    const rawCnpj = dto.cnpj?.trim();
    if (rawCnpj) {
      const digits = rawCnpj.replace(/\D/g, '');
      if (digits.length !== 14) {
        throw new BadRequestException('CNPJ deve ter 14 dígitos');
      }
      cnpjValue = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;

      const dupCnpj = await db
        .select({ id: escritorio.id })
        .from(escritorio)
        .where(eq(escritorio.cnpj, cnpjValue))
        .limit(1);

      if (dupCnpj.length) {
        throw new ConflictException('Este CNPJ já está cadastrado');
      }
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);

    const created = await db.transaction(async (tx) => {
      const [e] = await tx
        .insert(escritorio)
        .values({
          nome: dto.nomeEscritorio.trim(),
          cnpj: cnpjValue,
          config: {},
          ativo: true,
        })
        .returning({ id: escritorio.id });

      if (!e) {
        throw new Error('Falha ao criar escritório');
      }

      const [u] = await tx
        .insert(usuario)
        .values({
          escritorioId: e.id,
          email,
          senhaHash,
          nome: dto.nomeAdmin.trim(),
          perfil: 'admin',
          ativo: true,
        })
        .returning();

      if (!u) {
        throw new Error('Falha ao criar usuário administrador');
      }

      return u;
    });

    return this.emitAuthTokens(created);
  }

  async refresh(rawRefresh: string) {
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET não configurado');
    }

    let payload: AccessJwtPayload;
    try {
      payload = jwt.verify(rawRefresh, refreshSecret) as AccessJwtPayload;
    } catch {
      throw new UnauthorizedException('Sessão inválida');
    }

    const db = this.drizzle.db;
    const hash = hashToken(rawRefresh);

    const existing = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, hash),
          eq(refreshTokens.revogado, false),
        ),
      )
      .limit(1);

    if (!existing.length) {
      throw new UnauthorizedException('Sessão inválida');
    }

    await db
      .update(refreshTokens)
      .set({ revogado: true })
      .where(eq(refreshTokens.id, existing[0].id));

    const users = await db
      .select()
      .from(usuario)
      .where(
        and(eq(usuario.id, payload.sub), eq(usuario.ativo, true)),
      )
      .limit(1);

    const row = users[0];
    if (!row) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const accessPayload: AccessJwtPayload = {
      sub: row.id,
      escritorioId: row.escritorioId,
      perfil: row.perfil,
      email: row.email,
    };

    const accessToken = this.jwtService.sign(accessPayload);

    const refreshExpires = (process.env.JWT_REFRESH_EXPIRES_IN ??
      '7d') as SignOptions['expiresIn'];

    const newRefresh = jwt.sign(
      {
        sub: row.id,
        escritorioId: row.escritorioId,
        perfil: row.perfil,
        email: row.email,
      },
      refreshSecret,
      { expiresIn: refreshExpires } satisfies jwt.SignOptions,
    );

    const decoded = jwt.decode(newRefresh) as jwt.JwtPayload;
    const expiresAt = new Date((decoded.exp ?? 0) * 1000);

    await db.insert(refreshTokens).values({
      usuarioId: row.id,
      tokenHash: hashToken(newRefresh),
      expiresAt,
      revogado: false,
    });

    return {
      accessToken,
      refreshToken: newRefresh,
      user: {
        id: row.id,
        nome: row.nome,
        email: row.email,
        perfil: row.perfil,
        escritorioId: row.escritorioId,
      },
    };
  }

  async logout(refreshCookie?: string) {
    if (!refreshCookie) {
      return;
    }
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      return;
    }
    try {
      jwt.verify(refreshCookie, refreshSecret);
    } catch {
      return;
    }
    const hash = hashToken(refreshCookie);
    await this.drizzle.db
      .update(refreshTokens)
      .set({ revogado: true })
      .where(eq(refreshTokens.tokenHash, hash));
  }

  async solicitarRecuperarSenha(email: string) {
    const e = email.trim().toLowerCase();
    const [u] = await this.drizzle.db
      .select({ id: usuario.id })
      .from(usuario)
      .where(eq(usuario.email, e))
      .limit(1);

    if (u) {
      const raw = randomBytes(32).toString('hex');
      const tokenHash = hashToken(raw);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await this.drizzle.db.insert(passwordResetToken).values({
        usuarioId: u.id,
        tokenHash,
        expiresAt,
      });

      const base =
        process.env.FRONTEND_PASSWORD_RESET_URL?.trim() ||
        process.env.APP_PUBLIC_WEB_URL?.trim() ||
        'http://localhost:3000';
      const link = `${base.replace(/\/$/, '')}/redefinir-senha?token=${raw}`;

      await this.mail.send({
        to: e,
        subject: 'Redefinição de senha — CONECTAR',
        text: `Olá,\n\nPara redefinir sua senha, acesse (válido por 1 hora):\n${link}\n\nSe você não solicitou, ignore este e-mail.`,
      });
    }

    return {
      ok: true,
      message:
        'Se existir uma conta para este e-mail, enviaremos instruções em breve.',
    };
  }

  async redefinirSenha(token: string, novaSenha: string) {
    const tokenHash = hashToken(token.trim());
    const [row] = await this.drizzle.db
      .select()
      .from(passwordResetToken)
      .where(
        and(
          eq(passwordResetToken.tokenHash, tokenHash),
          gt(passwordResetToken.expiresAt, new Date()),
          isNull(passwordResetToken.usedAt),
        ),
      )
      .limit(1);

    if (!row) {
      throw new BadRequestException('Token inválido ou expirado.');
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await this.drizzle.db
      .update(usuario)
      .set({ senhaHash })
      .where(eq(usuario.id, row.usuarioId));

    await this.drizzle.db
      .update(passwordResetToken)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetToken.id, row.id));

    return { ok: true };
  }
}
