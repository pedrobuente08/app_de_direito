import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, eq, or } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { usuario } from '../db/schema/usuario';
import { EscritorioService } from '../escritorio/escritorio.service';
import type { CreateUsuarioDto } from './dto/create-usuario.dto';
import type { UpdateUsuarioDto } from './dto/update-usuario.dto';

function normalizarLoginAliases(raw?: string[] | null): string[] {
  if (!raw?.length) {
    return [];
  }
  const visto = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    const u = x?.trim().toUpperCase();
    if (u && !visto.has(u)) {
      visto.add(u);
      out.push(u);
    }
  }
  return out;
}

@Injectable()
export class UsuariosService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly escritorio: EscritorioService,
  ) {}

  async listar(escritorioId: string) {
    return this.drizzle.db
      .select({
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        perfil: usuario.perfil,
        ativo: usuario.ativo,
        createdAt: usuario.createdAt,
        loginAliases: usuario.loginAliases,
        ehPautista: usuario.ehPautista,
      })
      .from(usuario)
      .where(eq(usuario.escritorioId, escritorioId));
  }

  /** Usuários que podem ser atribuídos como pautista em audiências (dropdown). */
  async listarOpcoesPautista(escritorioId: string) {
    const rows = await this.drizzle.db
      .select({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        ehPautista: usuario.ehPautista,
      })
      .from(usuario)
      .where(
        and(
          eq(usuario.escritorioId, escritorioId),
          eq(usuario.ativo, true),
          or(eq(usuario.perfil, 'pautista'), eq(usuario.ehPautista, true)),
        ),
      );
    return rows
      .map((r) => ({
        id: r.id,
        nome: r.nome?.trim() || r.email,
        email: r.email,
        perfil: r.perfil,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  async criar(escritorioId: string, dto: CreateUsuarioDto) {
    const email = dto.email.toLowerCase().trim();

    const dup = await this.drizzle.db
      .select({ id: usuario.id })
      .from(usuario)
      .where(eq(usuario.email, email))
      .limit(1);

    if (dup.length) {
      throw new ConflictException('Este e-mail já está em uso');
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);

    const ehPautista =
      dto.perfil === 'pautista' ? true : (dto.ehPautista ?? false);

    const [row] = await this.drizzle.db
      .insert(usuario)
      .values({
        escritorioId,
        email,
        senhaHash,
        nome: dto.nome?.trim() ?? null,
        perfil: dto.perfil,
        ehPautista,
        ativo: true,
        loginAliases: normalizarLoginAliases(dto.loginAliases),
      })
      .returning({
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        perfil: usuario.perfil,
        ehPautista: usuario.ehPautista,
        ativo: usuario.ativo,
        createdAt: usuario.createdAt,
        loginAliases: usuario.loginAliases,
      });

    if (!row) {
      throw new ConflictException('Falha ao criar usuário');
    }
    this.escritorio.invalidarCacheSkill(escritorioId);
    return row;
  }

  async atualizar(
    escritorioId: string,
    id: string,
    dto: UpdateUsuarioDto,
    actorUserId: string,
  ) {
    const [existing] = await this.drizzle.db
      .select()
      .from(usuario)
      .where(
        and(eq(usuario.escritorioId, escritorioId), eq(usuario.id, id)),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (
      dto.ativo === false &&
      id === actorUserId &&
      existing.perfil === 'admin'
    ) {
      throw new ConflictException(
        'Você não pode desativar a própria conta administrativa aqui.',
      );
    }

    const patch: Partial<typeof usuario.$inferInsert> = {};

    if (dto.nome !== undefined) {
      patch.nome = dto.nome?.trim() ?? null;
    }
    if (dto.perfil !== undefined) {
      patch.perfil = dto.perfil;
      if (dto.perfil === 'pautista') {
        patch.ehPautista = true;
      } else if (dto.ehPautista === undefined && existing.perfil === 'pautista') {
        patch.ehPautista = false;
      }
    }
    if (dto.ehPautista !== undefined) {
      patch.ehPautista =
        (dto.perfil ?? existing.perfil) === 'pautista'
          ? true
          : dto.ehPautista;
    }
    if (dto.ativo !== undefined) {
      patch.ativo = dto.ativo;
    }
    if (dto.senha !== undefined) {
      patch.senhaHash = await bcrypt.hash(dto.senha, 10);
    }
    if (dto.loginAliases !== undefined) {
      patch.loginAliases = normalizarLoginAliases(dto.loginAliases);
    }

    if (!Object.keys(patch).length) {
      return this.omitSenha(existing);
    }

    await this.drizzle.db
      .update(usuario)
      .set(patch)
      .where(eq(usuario.id, id));

    this.escritorio.invalidarCacheSkill(escritorioId);

    const [out] = await this.drizzle.db
      .select()
      .from(usuario)
      .where(eq(usuario.id, id))
      .limit(1);

    return this.omitSenha(out!);
  }

  private omitSenha(row: typeof usuario.$inferSelect) {
    const { senhaHash: _, ...rest } = row;
    return rest;
  }
}
