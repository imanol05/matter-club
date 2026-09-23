/**
 * Prueba concluyente de que el público no puede leer los datos personales.
 *
 *   node verificar-privacidad.mjs
 *
 * La prueba anterior era tramposa: daba por buena una respuesta de cero filas,
 * pero cero filas es lo mismo que devuelve una tabla vacía. Con RLS activo y
 * sin política de SELECT, PostgREST no tira error — simplemente no devuelve
 * nada, que es indistinguible de "no hay datos".
 *
 * Así que primero confirma que haya reservas cargadas (mirando la vista
 * pública, que sí las muestra) y recién ahí comprueba que la tabla cruda no
 * suelte ni una fila.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => l.split(/=(.*)/s).slice(0, 2)),
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { data: publicas, error: errPub } = await db
  .from("disponibilidad")
  .select("inicio, fin");

if (errPub) {
  console.log("No se pudo leer la vista pública:", errPub.message);
  process.exit(1);
}

console.log(`\nReservas visibles en la vista pública: ${publicas.length}`);
if (publicas.length === 0) {
  console.log(
    "La base está vacía, así que la prueba no concluiría nada.\n" +
      "Corré antes `node verificar-backend.mjs` para que queden reservas de prueba.",
  );
  process.exit(1);
}
console.log("(o sea: SÍ hay filas en la tabla reservas)\n");

let mal = 0;
const probar = async (nombre, consulta) => {
  const { data, error } = await consulta;
  const filtrado = Boolean(error) || !data || data.length === 0;
  console.log(`  ${filtrado ? "✓" : "✗"} ${nombre} — ${
    error ? `error: ${error.message.slice(0, 50)}` : `${data?.length ?? 0} filas`
  }`);
  if (!filtrado) {
    mal++;
    console.log(`      FUGA: ${JSON.stringify(data[0])}`);
  }
};

console.log("Intentos de sacar datos personales con la clave pública:");
await probar("select nombre, telefono", db.from("reservas").select("nombre, telefono"));
await probar("select *", db.from("reservas").select("*"));
await probar("count(*)", db.from("reservas").select("id", { count: "exact" }));
await probar("teléfonos de turnos fijos", db.from("turnos_fijos").select("nombre, telefono"));
await probar("lista de espera", db.from("esperas").select("nombre, telefono"));

console.log(
  `\n${mal === 0
    ? "BIEN · la vista pública muestra los horarios y nada más"
    : `MAL · ${mal} consulta(s) filtraron datos personales`}\n`,
);
process.exit(mal === 0 ? 0 : 1);
