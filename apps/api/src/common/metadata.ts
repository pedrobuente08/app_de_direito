import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';

/** Perfis permitidos no JWT (`usuario.perfil`). */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
