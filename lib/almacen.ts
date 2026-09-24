/**
 * Los datos del turnero, contra Supabase.
 *
 * Sigue siendo un store a nivel módulo fuera de React: la base es un sistema
 * externo y sincronizarse con uno es para lo que existe useSyncExternalStore.
 * Lo único que consumen las pantallas es el hook de lib/store.tsx.
 *
 * Hay dos vistas del mismo dato según quién mire:
 *
 * - El **público** sólo puede leer las vistas `disponibilidad` y
 *   `fijos_publicos`, que dicen qué rangos están tomados y nada más. No hay
 *   forma de que averigüe de quién es cada turno, ni forzando la pantalla: se
 *   lo impiden las políticas de la base, no el código de acá.
 * - El **encargado** lee las tablas completas, con nombres y teléfonos.
 *
 * Por eso `Ocupacion` tiene el caso "ocupado" a secas: es lo que el público
 * puede saber.
 */

import {
  CANCHA_ID,
  type Espera,
  type NuevaSolicitud,
  type NuevoFijo,
  type Ocupacion,
  type Reserva,
  type TurnoFijo,
} from "./tipos";
import {
  SEMANAS_A_FUTURO,
  claveFecha,
  desdeInicio,
  diaSemana,
  finISO,
  idSlot,
  inicioISO,
  lunesDeLaSemana,
  sumarDias,
} from "./horarios";
import { supabase } from "./supabase";

/** Regla semanal ya resuelta para consultar, con o sin datos personales. */
type FijoEnGrilla = {
  diaSemana: number;
  bloque: number;
  desde: string;
  hasta: string | null;
  /** Sólo lo completa el encargado. */
  completo?: TurnoFijo;
};

export type Datos = {
  cargando: boolean;
  error: string | null;
  /** true si estamos viendo las tablas completas (o sea, es el encargado). */
  completo: boolean;
  /** Vacío para el público. */
  reservas: Reserva[];
  /** Vacío para el público. */
  esperas: Espera[];
  fijos: FijoEnGrilla[];
  /** Ocupación por celda. Para el público los valores son `{tipo:"ocupado"}`. */
  porSlot: Map<string, Ocupacion>;
};

const VACIO: Datos = {
  cargando: true,
  error: null,
  completo: false,
  reservas: [],
  esperas: [],
  fijos: [],
  porSlot: new Map(),
};

let datos: Datos = VACIO;
let arrancado = false;
const oyentes = new Set<() => void>();

function publicar(parcial: Partial<Datos>) {
  datos = { ...datos, ...parcial };
  for (const o of oyentes) o();
}

export function instantanea(): Datos {
  return datos;
}

export function instantaneaServidor(): Datos {
  return VACIO;
}

export function suscribir(alCambiar: () => void): () => void {
  if (!arrancado) {
    arrancado = true;
    void recargar();
  }
  oyentes.add(alCambiar);
  return () => {
    oyentes.delete(alCambiar);
  };
}

/** Ventana de fechas que se trae: no tiene sentido bajar toda la historia. */
function ventana() {
  const lunes = lunesDeLaSemana(new Date());
  return {
    desde: inicioISO(sumarDias(lunes, -14), 0),
    hasta: inicioISO(sumarDias(lunes, (SEMANAS_A_FUTURO + 2) * 7), 0),
  };
}

/**
 * Trae todo de nuevo.
 *
 * Sin sesión va derecho a las vistas públicas. Ese es el caso del 99% de las
 * visitas, y probar primero las tablas completas les costaría cuatro pedidos
 * al pedo: la base contesta vacío en vez de error, así que habría que
 * preguntarle además si es encargado para saber si ese vacío era real.
 *
 * Igual el permiso no se decide acá: aunque alguien fuerce el camino del
 * encargado, lo que puede leer lo deciden las políticas RLS de la base.
 */
export async function recargar() {
  if (!supabase) {
    publicar({ cargando: false, error: "Falta configurar el servidor." });
    return;
  }

  const { desde, hasta } = ventana();
  publicar({ cargando: true, error: null });

  // getSession() no sale a la red: lee la sesión guardada en el navegador.
  const { data: sesion } = await supabase.auth.getSession();
  if (!sesion.session) {
    await cargarComoPublico(desde, hasta);
    return;
  }

  const [{ data: reservas }, { data: fijos }, { data: esperas }] = await Promise.all([
    supabase
      .from("reservas")
      .select("*")
      .gte("inicio", desde)
      .lt("inicio", hasta)
      .order("inicio"),
    supabase.from("turnos_fijos").select("*"),
    supabase.from("esperas").select("*").gte("inicio", desde).order("inicio"),
  ]);

  // Hay sesión, pero puede no ser de un encargado: ahí la base devuelve vacío,
  // no error. Con filas ya sabemos que sí; sin filas hay que preguntar.
  if (reservas && reservas.length > 0) {
    publicarComoEncargado(reservas, fijos ?? [], esperas ?? []);
    return;
  }

  const { data: esEncargado } = await supabase.rpc("es_encargado");
  if (esEncargado) {
    publicarComoEncargado([], fijos ?? [], esperas ?? []);
    return;
  }

  await cargarComoPublico(desde, hasta);
}

function publicarComoEncargado(
  filas: RowReserva[],
  filasFijos: RowFijo[],
  filasEsperas: RowEspera[],
) {
  const reservas = filas.map(aReserva);
  const fijos: FijoEnGrilla[] = filasFijos.map((f) => ({
    diaSemana: f.dia_semana,
    bloque: f.bloque,
    desde: f.desde,
    hasta: f.hasta,
    completo: aFijo(f),
  }));

  const porSlot = new Map<string, Ocupacion>();
  for (const r of reservas) {
    if (!OCUPAN.includes(r.estado)) continue;
    porSlot.set(idSlot(r.jornada, r.bloque), { tipo: "reserva", reserva: r });
  }

  publicar({
    cargando: false,
    error: null,
    completo: true,
    reservas,
    esperas: filasEsperas.map(aEspera),
    fijos,
    porSlot,
  });
}

async function cargarComoPublico(desde: string, hasta: string) {
  const db = supabase!;
  const [{ data: ocupados, error }, { data: fijosPub }] = await Promise.all([
    db.from("disponibilidad").select("inicio").gte("inicio", desde).lt("inicio", hasta),
    db.from("fijos_publicos").select("*"),
  ]);

  if (error) {
    publicar({ cargando: false, error: "No pudimos consultar la disponibilidad." });
    return;
  }

  const porSlot = new Map<string, Ocupacion>();
  for (const o of ocupados ?? []) {
    const { jornada, bloque } = desdeInicio(o.inicio as string);
    porSlot.set(idSlot(jornada, bloque), { tipo: "ocupado" });
  }

  publicar({
    cargando: false,
    error: null,
    completo: false,
    reservas: [],
    esperas: [],
    fijos: (fijosPub ?? []).map((f) => ({
      diaSemana: f.dia_semana as number,
      bloque: f.bloque as number,
      desde: f.desde as string,
      hasta: f.hasta as string | null,
    })),
    porSlot,
  });
}

/** Estados que hacen que un horario no se pueda pedir. */
const OCUPAN: Reserva["estado"][] = ["pendiente", "confirmada", "bloqueo"];

// ---------------------------------------------------------------------------
// Traducción entre las filas de la base y los tipos de la app
// ---------------------------------------------------------------------------

type RowReserva = {
  id: string; cancha_id: string; inicio: string; fin: string;
  estado: string; nombre: string; telefono: string; nota: string | null; creada: string;
};
type RowFijo = {
  id: string; cancha_id: string; dia_semana: number; bloque: number;
  nombre: string; telefono: string; desde: string; hasta: string | null; creado: string;
};
type RowEspera = {
  id: string; cancha_id: string; inicio: string;
  nombre: string; telefono: string; creada: string;
};

function aReserva(f: RowReserva): Reserva {
  const { jornada, bloque } = desdeInicio(f.inicio);
  return {
    id: f.id,
    canchaId: f.cancha_id,
    jornada,
    bloque,
    inicio: f.inicio,
    estado: f.estado as Reserva["estado"],
    nombre: f.nombre,
    telefono: f.telefono,
    nota: f.nota ?? undefined,
    creada: f.creada,
  };
}

function aFijo(f: RowFijo): TurnoFijo {
  return {
    id: f.id,
    canchaId: f.cancha_id,
    diaSemana: f.dia_semana,
    bloque: f.bloque,
    nombre: f.nombre,
    telefono: f.telefono,
    desde: f.desde,
    hasta: f.hasta,
    creado: f.creado,
  };
}

function aEspera(f: RowEspera): Espera {
  const { jornada, bloque } = desdeInicio(f.inicio);
  return {
    id: f.id,
    canchaId: f.cancha_id,
    jornada,
    bloque,
    nombre: f.nombre,
    telefono: f.telefono,
    creada: f.creada,
  };
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

/**
 * Devuelve quién tiene tomado cada bloque.
 *
 * Los turnos fijos se resuelven acá, al consultarse, en vez de guardarse
 * semana por semana. Una reserva concreta le gana al fijo: si alguien ya tenía
 * tomado ese día puntual antes de que existiera la regla, el que estaba
 * primero manda.
 */
export function crearBuscador(d: Datos) {
  const porHueco = new Map<string, FijoEnGrilla[]>();
  for (const f of d.fijos) {
    const clave = `${f.diaSemana}#${f.bloque}`;
    const lista = porHueco.get(clave);
    if (lista) lista.push(f);
    else porHueco.set(clave, [f]);
  }

  return (jornada: string, bloque: number): Ocupacion | undefined => {
    const directa = d.porSlot.get(idSlot(jornada, bloque));
    if (directa) return directa;

    // Las claves son YYYY-MM-DD, así que alcanza con comparar como texto.
    const fijo = porHueco
      .get(`${diaSemana(jornada)}#${bloque}`)
      ?.find((f) => jornada >= f.desde && (f.hasta === null || jornada <= f.hasta));

    if (!fijo) return undefined;
    return fijo.completo
      ? { tipo: "fijo", fijo: fijo.completo }
      : { tipo: "ocupado" };
  };
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------

type Resultado = { ok: boolean; motivo?: string };

/** El error del constraint de exclusión, traducido a algo que se pueda leer. */
function traducir(error: { code?: string; message: string } | null): string {
  if (!error) return "Algo salió mal.";
  if (error.code === "23P01" || error.message.includes("solapamiento")) {
    return "Ese horario se acaba de ocupar. Probá con otro.";
  }
  if (error.code === "42501") {
    return "No tenés permiso para hacer eso.";
  }
  return error.message;
}

export async function solicitar(n: NuevaSolicitud): Promise<Resultado> {
  if (!supabase) return { ok: false, motivo: "Falta configurar el servidor." };

  // No hay chequeo previo de disponibilidad a propósito: entre preguntar y
  // escribir, otro puede haber reservado. El que decide es el constraint de
  // exclusión de la base, que no tiene esa ventana.
  const { error } = await supabase.from("reservas").insert({
    cancha_id: CANCHA_ID,
    inicio: inicioISO(n.jornada, n.bloque),
    fin: finISO(n.jornada, n.bloque),
    estado: "pendiente",
    nombre: n.nombre.trim(),
    telefono: n.telefono.trim(),
    nota: n.nota?.trim() || null,
  });

  if (error) return { ok: false, motivo: traducir(error) };
  await recargar();
  return { ok: true };
}

async function cambiarEstado(id: string, estado: Reserva["estado"]): Promise<Resultado> {
  if (!supabase) return { ok: false, motivo: "Falta configurar el servidor." };
  const { error } = await supabase.from("reservas").update({ estado }).eq("id", id);
  if (error) return { ok: false, motivo: traducir(error) };
  await recargar();
  return { ok: true };
}

export const confirmar = (id: string) => cambiarEstado(id, "confirmada");
export const rechazar = (id: string) => cambiarEstado(id, "rechazada");

export async function eliminar(id: string): Promise<Resultado> {
  if (!supabase) return { ok: false, motivo: "Falta configurar el servidor." };
  const { error } = await supabase.from("reservas").delete().eq("id", id);
  if (error) return { ok: false, motivo: traducir(error) };
  await recargar();
  return { ok: true };
}

export async function bloquear(
  jornada: string,
  bloque: number,
  nota: string,
): Promise<Resultado> {
  if (!supabase) return { ok: false, motivo: "Falta configurar el servidor." };
  const { error } = await supabase.from("reservas").insert({
    cancha_id: CANCHA_ID,
    inicio: inicioISO(jornada, bloque),
    fin: finISO(jornada, bloque),
    estado: "bloqueo",
    nombre: "No disponible",
    telefono: "",
    nota: nota.trim() || null,
  });
  if (error) return { ok: false, motivo: traducir(error) };
  await recargar();
  return { ok: true };
}

export async function crearFijo(n: NuevoFijo): Promise<Resultado> {
  if (!supabase) return { ok: false, motivo: "Falta configurar el servidor." };
  const { error } = await supabase.from("turnos_fijos").insert({
    cancha_id: CANCHA_ID,
    dia_semana: n.diaSemana,
    bloque: n.bloque,
    nombre: n.nombre.trim(),
    telefono: n.telefono.trim(),
    desde: n.desde,
  });
  if (error) {
    return {
      ok: false,
      motivo: error.code === "23505"
        ? "Ya hay un turno fijo vigente en ese día y horario."
        : traducir(error),
    };
  }
  await recargar();
  return { ok: true };
}

/**
 * Corta un turno fijo a partir de mañana en vez de borrarlo.
 *
 * Las semanas pasadas tienen que seguir mostrándolo porque ese grupo
 * efectivamente jugó, y vale hasta hoy inclusive: dar de baja los martes a la
 * mañana no le saca la cancha al grupo esa misma noche.
 */
export async function darDeBajaFijo(id: string): Promise<Resultado> {
  if (!supabase) return { ok: false, motivo: "Falta configurar el servidor." };
  const { error } = await supabase
    .from("turnos_fijos")
    .update({ hasta: claveFecha(new Date()) })
    .eq("id", id);
  if (error) return { ok: false, motivo: traducir(error) };
  await recargar();
  return { ok: true };
}

export async function anotarEnEspera(
  e: Omit<Espera, "id" | "canchaId" | "creada">,
): Promise<Resultado> {
  if (!supabase) return { ok: false, motivo: "Falta configurar el servidor." };
  const { error } = await supabase.from("esperas").insert({
    cancha_id: CANCHA_ID,
    inicio: inicioISO(e.jornada, e.bloque),
    nombre: e.nombre.trim(),
    telefono: e.telefono.trim(),
  });
  if (error) return { ok: false, motivo: traducir(error) };
  await recargar();
  return { ok: true };
}

export async function quitarEspera(id: string): Promise<Resultado> {
  if (!supabase) return { ok: false, motivo: "Falta configurar el servidor." };
  const { error } = await supabase.from("esperas").delete().eq("id", id);
  if (error) return { ok: false, motivo: traducir(error) };
  await recargar();
  return { ok: true };
}
