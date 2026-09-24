/** Public URL for a file in the `candidate-photos` bucket (public read —
 * see supabase/migrations/20260924000008_storage.sql). */
export function candidatePhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/candidate-photos/${path}`;
}
