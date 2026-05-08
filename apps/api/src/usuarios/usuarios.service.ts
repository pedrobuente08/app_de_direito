import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { usuario } from '../db/schema/usuario';
import type { CreateUsuarioDto } from './dto/create-usuario.dto';
import type { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly drizzle: DrizzleService) {}

  async listar(escritorioId: string) {
    return this.drizzle.db
      .select({
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        perfil: usuario.perfil,
        ativo: usuario.ativo,
        createdAt: usuario.createdAt,
      })
      .from(usuario)
      .where(eq(usuario.escritorioId, escritorioId));
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

    const [row] = await this.drizzle.db
      .insert(usuario)
      .values({
        escritorioId,
        email,
        senhaHash,
        nome: dto.nome?.trim() ?? null,
        perfil: dto.perfil,
        ativo: true,
      })
      .returning({
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        perfil: usuario.perfil,
        ativo: usuario.ativo,
        createdAt: usuario.createdAt,
      });

    if (!row) {
      throw new ConflictException('Falha ao criar usuário');
    }
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
    }
    if (dto.ativo !== undefined) {
      patch.ativo = dto.ativo;
    }
    if (dto.senha !== undefined) {
      patch.senhaHash = await bcrypt.hash(dto.senha, 10);
    }

    if (!Object.keys(patch).length) {
      return this.omitSenha(existing);
    }

    await this.drizzle.db
      .update(usuario)
      .set(patch)
      .where(eq(usuario.id, id));

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
