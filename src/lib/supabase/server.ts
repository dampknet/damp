import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Component safe Supabase client:
 * - READ cookies is allowed
 * - WRITING cookies is NOT allowed here (Next.js restriction)
 * Cookie writing must happen in Middleware or Route Handlers.
 */
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // IMPORTANT:
          // Next.js Server Components cannot modify cookies.
          // We intentionally do nothing here.
        },
      },
    }
  );
}
