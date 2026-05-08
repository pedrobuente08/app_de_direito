/**
 * Remove `sslmode` da URI para compatibilidade com `pg` ≥8 + Supabase:
 * `sslmode=require` passou a ser tratado como verify-full e pode falhar com
 * SELF_SIGNED_CERT_IN_CHAIN em alguns ambientes (ex.: Node em macOS).
 */
export function normalizePostgresUrl(url: string): string {
  return url
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/g, '?')
    .replace(/[?&]+$/g, '');
}
