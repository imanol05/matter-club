/**
 * ¿Cualquiera puede crearse una cuenta en el proyecto?
 *
 *   node verificar-registro.mjs
 *
 * Importa porque las políticas del esquema le dan control total del panel a
 * cualquier usuario autenticado. Si el registro está abierto, alguien se crea
 * una cuenta y pasa a manejar la agenda de Matter.
 *
 * Pregunta la configuración directamente en /auth/v1/settings en vez de
 * intentar registrarse. Intentarlo era mala idea por dos motivos: si el
 * registro estaba abierto dejaba un usuario basura, y si fallaba no se podía
 * saber si fue por la configuración o porque el mail de prueba no le gustó
 * a Supabase — que es justo lo que pasó la primera vez.
 */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => l.split(/=(.*)/s).slice(0, 2)),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const res = await fetch(`${url}/auth/v1/settings`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});

if (!res.ok) {
  console.log(`\nNo se pudo consultar la configuración (HTTP ${res.status})\n`);
  process.exit(2);
}

const cfg = await res.json();

console.log("");
if (cfg.disable_signup === true) {
  console.log("REGISTRO CERRADO ✓  — sólo vos podés dar de alta usuarios");
} else if (cfg.disable_signup === false) {
  console.log("REGISTRO ABIERTO ✗  — cualquiera puede crearse una cuenta");
  console.log("   y quedaría con control total del panel del encargado.");
  console.log("");
  console.log("   Se apaga en: Authentication → Sign In / Providers,");
  console.log('   en la página (no adentro del proveedor Email),');
  console.log('   buscando "Allow new users to sign up".');
} else {
  console.log("No pude determinarlo: el campo disable_signup no vino en la respuesta.");
  console.log("Configuración recibida:", JSON.stringify(cfg, null, 2));
  process.exit(2);
}

console.log("");
console.log("De paso, otras cosas de la configuración:");
console.log("  confirmación de mail obligatoria:", cfg.mailer_autoconfirm === false ? "sí" : "no");
console.log("  login con email habilitado:      ", cfg.external?.email ? "sí" : "no");
console.log("");

process.exit(cfg.disable_signup === true ? 0 : 1);
