/**
 * Seed inicial — dados de referência alinhados ao PROJETO_CONECTAR §15.
 * Rode após `npm run db:push` na raiz do monorepo (Postgres disponível).
 *
 *   cd apps/api && cp .env.example .env  # ajuste DATABASE_URL e JWT_*
 *   npm run db:push && npm run db:seed
 */

import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { normalizePostgresUrl } from '../database-url';
import { schema } from '../schema';
import { comarca } from '../schema/comarca';
import type { EscritorioConfig } from '../schema/escritorio';
import { escritorio } from '../schema/escritorio';
import type { Perfil } from '../schema/usuario';
import { usuario } from '../schema/usuario';

const ESCRITORIO = {
  nome: 'Escritório (seed)',
  cnpj: '00.000.000/0001-00',
  materias_validas: [
    'NEGATIVAÇÃO',
    'CONTA CANCELADA',
    'CREFISA-BOLSA F.',
    'REGISTRATO',
    'SERASA',
    'PESSOAL',
    'APOSENTADOS',
    'VAZAMENTO DADOS NEON',
    'EMBASA',
  ],
};

const COMARCAS = [
  { codigo: '0001', nome: 'Salvador', abreviado: 'SSA' },
  { codigo: '0004', nome: 'Alagoinhas', abreviado: 'ALAGOINHAS' },
  { codigo: '0039', nome: 'Feira de Santana', abreviado: 'F. DE SANTANA' },
  { codigo: '0044', nome: 'Camaçari', abreviado: 'CAMACARI' },
  { codigo: '0075', nome: 'Encruzilhada', abreviado: 'ENCRUZILHADA' },
  { codigo: '0080', nome: 'Itabuna', abreviado: 'ITABUNA' },
  { codigo: '0103', nome: 'Teixeira de Freitas', abreviado: 'TEIXEIRA DE FREITAS' },
  { codigo: '0113', nome: 'Vitória da Conquista', abreviado: 'VIT. DA CONQUISTA' },
  { codigo: '0146', nome: 'Porto Seguro', abreviado: 'PORTO SEGURO' },
  { codigo: '0150', nome: 'Ilhéus', abreviado: 'ILHEUS' },
  { codigo: '0208', nome: 'Remanso', abreviado: 'REMANSO' },
  { codigo: '0238', nome: 'Lauro de Freitas', abreviado: 'LAURO' },
  { codigo: '0250', nome: 'Simões Filho', abreviado: 'SIMOES FILHO' },
  { codigo: '0274', nome: 'Eunápolis', abreviado: 'EUNAPOLIS' },
];

const CAPTADORES: { nome: string; aliases: string[]; perfil?: Perfil }[] = [
  { nome: 'TAINARA', aliases: ['TAINARA'] },
  { nome: 'TAINÁ', aliases: ['TAINÁ', 'TAINA'] },
  {
    nome: 'ANDRÉ PITA',
    aliases: [
      'ANDRÉ PITA',
      'ANDRE PITA',
      'ANDRÉ',
      'ANDRE',
      'ANDRE GABRIEL',
      'ANDRÉ GABRIEL',
    ],
  },
  { nome: 'ANTONIO FERNANDO', aliases: ['ANTONIO FERNANDO', 'ANTÔNIO FERNANDO'] },
  { nome: 'FERNANDO', aliases: ['FERNANDO', 'FERANDO'] },
  { nome: 'MURILO', aliases: ['MURILO'] },
  { nome: 'LÚCIO', aliases: ['LÚCIO', 'LUCIO'] },
  { nome: 'GABRIELLE', aliases: ['GABRIELLE', 'GABRIELLE SANTANA'] },
  { nome: 'LÍVIA', aliases: ['LÍVIA', 'LIVIA'] },
  { nome: 'EURIDICE', aliases: ['EURIDICE', 'EURÍDICE'] },
  { nome: 'LUIZ ROCHA', aliases: ['LUIZ ROCHA'] },
  { nome: 'LUCAS GARCIA', aliases: ['LUCAS GARCIA'] },
  { nome: 'RORIZ', aliases: ['RORIZ'] },
  { nome: 'ANDRE LUIZ', aliases: ['ANDRE LUIZ', 'ANDRÉ LUIZ'] },
];

const SENHA_TEMPORARIA = 'SenhaTemp123!';

function slugEmail(prefix: string): string {
  const base = prefix
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '');
  return `${base || 'usuario'}@seed.conectar.local`;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL ausente');
  }

  const pool = new Pool({ connectionString: normalizePostgresUrl(url) });
  const db = drizzle(pool, { schema });

  const jaExiste = await db
    .select({ id: escritorio.id })
    .from(escritorio)
    .where(eq(escritorio.cnpj, ESCRITORIO.cnpj))
    .limit(1);

  if (jaExiste.length) {
    console.info('Seed já aplicado (CNPJ existente). Nada a fazer.');
    await pool.end();
    return;
  }

  const config: EscritorioConfig = {
    materias_validas: ESCRITORIO.materias_validas,
    fase_inicial: 'AUDIÊNCIA AGENDADA',
    situacao_inicial: 'ATIVO',
    status_processo_inicial: 'ATIVO',
  };

  const [e] = await db
    .insert(escritorio)
    .values({
      nome: ESCRITORIO.nome,
      cnpj: ESCRITORIO.cnpj,
      config,
      ativo: true,
    })
    .returning({ id: escritorio.id });

  if (!e) {
    throw new Error('Falha ao criar escritório');
  }

  const escritorioId = e.id;

  for (const c of COMARCAS) {
    await db.insert(comarca).values({
      escritorioId,
      codigo: c.codigo,
      nome: c.nome,
      abreviado: c.abreviado,
    });
  }

  const senhaHash = await bcrypt.hash(SENHA_TEMPORARIA, 10);

  await db.insert(usuario).values({
    escritorioId,
    email: 'admin@seed.conectar.local',
    senhaHash,
    nome: 'Administrador',
    perfil: 'admin',
    ativo: true,
    loginAliases: [],
  });

  for (const row of CAPTADORES) {
    const email = slugEmail(row.nome);
    const existing = await db
      .select({ id: usuario.id })
      .from(usuario)
      .where(eq(usuario.email, email))
      .limit(1);
    if (existing.length) {
      continue;
    }
    await db.insert(usuario).values({
      escritorioId,
      email,
      senhaHash,
      nome: row.nome,
      perfil: row.perfil ?? 'adm',
      ativo: true,
      loginAliases: [
        ...new Set(
          row.aliases
            .map((a) => a.trim().toUpperCase())
            .filter(Boolean),
        ),
      ],
    });
  }

  await pool.end();

  console.info('Seed concluído.');
  console.info(`  Escritório ID: ${escritorioId}`);
  console.info(`  Admin: admin@seed.conectar.local / ${SENHA_TEMPORARIA}`);
  console.info(`  Demais usuários: */${SENHA_TEMPORARIA} (e-mail slug do nome)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
