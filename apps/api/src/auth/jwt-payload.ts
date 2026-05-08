import type { Perfil } from '../db/schema/usuario';

export interface AccessJwtPayload {
  sub: string;
  escritorioId: string;
  perfil: Perfil;
  email: string;
}
