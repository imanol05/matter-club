import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase.
 *
 * El sitio es estático y habla con la base directo desde el navegador, sin
 * servidor propio en el medio. Lo que protege los datos no es esconder la
 * clave anónima —que viaja dentro del JavaScript y cualquiera puede leer— sino
 * las políticas RLS definidas en supabase/migraciones/001_esquema.sql.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * true si el proyecto está configurado.
 *
 * Mientras no lo esté, la app sigue andando contra los datos de ejemplo en vez
 * de romperse: así el turnero se puede seguir mostrando sin credenciales.
 */
export const hayBackend = Boolean(url && anon);

export const supabase = hayBackend
  ? createClient(url!, anon!, {
      auth: {
        // El encargado queda logueado entre visitas; el público nunca se loguea.
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/** Igual que `supabase` pero sin el null: para código que ya verificó que hay backend. */
export function clienteObligatorio() {
  if (!supabase) {
    throw new Error(
      "Falta configurar Supabase. Copiá .env.local.example a .env.local y completá las credenciales.",
    );
  }
  return supabase;
}
