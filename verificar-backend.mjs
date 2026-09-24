/**
 * Comprueba que el esquema y las políticas de seguridad hagan lo que dicen.
 *
 *   node verificar-backend.mjs
 *
 * Corre con la clave anónima: exactamente los permisos que va a tener
 * cualquier visitante del sitio. Lo importante no es sólo que funcione lo que
 * tiene que funcionar, sino que falle lo que tiene que fallar.
 *
 * Deja un par de reservas de prueba en la base. Para borrarlas, desde el SQL
 * Editor de Supabase:
 *
 *   delete from reservas where telefono like '351 %' and nombre like '%Prueba%'
 *      or nombre in ('Doble Reserva', 'Turno Pegado', 'Solapado Parcial');
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => l.split(/=(.*)/s).slice(0, 2)),
);

const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

let ok = 0;
let mal = 0;
const check = (nombre, paso, detalle = "") => {
  console.log(`  ${paso ? "✓" : "✗"} ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  if (paso) ok++;
  else mal++;
};

const enHoras = (h) => new Date(Date.now() + h * 3600_000).toISOString();

console.log("\n=== Lo que el público SÍ puede hacer ===");
{
  const { error } = await db.from("disponibilidad").select("*").limit(1);
  check("leer qué horarios están ocupados", !error, error?.message);
}
{
  const { error } = await db.from("fijos_publicos").select("*").limit(1);
  check("leer los turnos fijos, sin datos personales", !error, error?.message);
}
{
  const { data, error } = await db.from("canchas").select("*");
  check("ver las canchas", !error && data?.length > 0, error?.message ?? `${data?.length} cancha(s)`);
}

console.log("\n=== Lo que el público NO tiene que poder ===");
{
  // Con RLS activo y sin política de SELECT, PostgREST no devuelve error:
  // devuelve cero filas. Y cero filas es lo mismo que contesta una tabla
  // vacía, así que esta prueba sola no concluye nada — hay que mirar antes si
  // hay datos. De eso se encarga verificar-privacidad.mjs; acá sólo avisamos.
  const { data, error } = await db.from("reservas").select("nombre, telefono").limit(1);
  const filtro = Boolean(error) || data?.length === 0;
  check(
    "sacar la agenda con nombres y teléfonos",
    filtro,
    filtro
      ? "no devuelve nada (confirmalo con verificar-privacidad.mjs)"
      : "DEVOLVIÓ DATOS · FUGA",
  );
}
{
  const { error } = await db.from("reservas").insert({
    cancha_id: "matter-1", inicio: enHoras(72), fin: enHoras(74),
    estado: "confirmada", nombre: "Colado Truchado", telefono: "351 000 0000",
  });
  check("auto-confirmarse un turno", Boolean(error), error ? "rechazado" : "LO DEJÓ PASAR");
}
{
  const { error } = await db.from("reservas").insert({
    cancha_id: "matter-1", inicio: enHoras(-48), fin: enHoras(-46),
    estado: "pendiente", nombre: "Viajero del Tiempo", telefono: "351 000 0000",
  });
  check("reservar en el pasado", Boolean(error), error ? "rechazado" : "LO DEJÓ PASAR");
}
{
  const { error } = await db.from("turnos_fijos").insert({
    cancha_id: "matter-1", dia_semana: 0, bloque: 6,
    nombre: "Intruso", telefono: "", desde: "2026-01-01",
  });
  check("crear un turno fijo", Boolean(error), error ? "rechazado" : "LO DEJÓ PASAR");
}

console.log("\n=== Pedir un turno, que es el caso normal ===");
const inicio = enHoras(100);
const fin = enHoras(102);
{
  const { error } = await db.from("reservas").insert({
    cancha_id: "matter-1", inicio, fin,
    estado: "pendiente", nombre: "Reserva De Prueba", telefono: "351 111 2222",
  });
  check("pedir un turno como pendiente", !error, error?.message ?? "creado");
}
{
  const { error } = await db.from("reservas").insert({
    cancha_id: "matter-1", inicio, fin,
    estado: "pendiente", nombre: "Doble Reserva", telefono: "351 333 4444",
  });
  check(
    "EL CONSTRAINT · pisar ese mismo horario",
    error?.code === "23P01" || Boolean(error?.message?.includes("solapamiento")),
    error ? "rechazado por la base" : "PERMITIÓ LA DOBLE RESERVA",
  );
}
{
  const { error } = await db.from("reservas").insert({
    cancha_id: "matter-1", inicio: enHoras(101), fin: enHoras(103),
    estado: "pendiente", nombre: "Solapado Parcial", telefono: "351 555 6666",
  });
  check("pisarlo sólo a medias", Boolean(error), error ? "rechazado" : "PERMITIÓ EL SOLAPE");
}
{
  const { error } = await db.from("reservas").insert({
    cancha_id: "matter-1", inicio: fin, fin: enHoras(104),
    estado: "pendiente", nombre: "Turno Pegado", telefono: "351 777 8888",
  });
  check("tomar el turno de justo después", !error, error?.message ?? "permitido");
}

console.log(
  `\n${mal === 0 ? "TODO BIEN" : "HAY ALGO MAL"} · ${ok} correctos, ${mal} fallidos\n`,
);
process.exit(mal === 0 ? 0 : 1);
