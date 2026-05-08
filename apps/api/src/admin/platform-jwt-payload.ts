export interface PlatformJwtPayload {
  sub: string;
  typ: 'platform';
  email: string;
}

export type PlatformAuthUser = {
  adminId: string;
  email: string;
};
