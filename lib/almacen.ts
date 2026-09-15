/**
 * Almacén de reservas de la demo: un store a nivel módulo, sin React.
 *
 * Vive en memoria y se respalda en localStorage, así el turnero y el panel del
 * encargado ven lo mismo y los cambios sobreviven a un F5.
 *
 * Está afuera de React a propósito: leer localStorage es justamente
 * "sincronizar con un sistema externo", que es para lo que existe
 * useSyncExternalStore. Meterlo en un useEffect + useState dispara renders en
 * cascada y además hace parpadear la UI.
 *
 * Cuando esto pase a Supabase se reemplaza este archivo y las pantallas no se
 * tocan: lo único que consumen es el hook de lib/store.tsx.
 */

import { CANCHA_ID, type NuevaSolicitud, type Reserva } from "./tipos";
import { idSlot, inicioISO } from "./horarios";
import { generarSemilla } from "./semilla";

/** Subir la versión cuando cambie la forma de la grilla (horarios, bloques):
 *  si no, quedan reservas guardadas apuntando a bloques que ya no existen. */
const CLAVE_LS = "matter-club:reservas:v2";

/** Estados que hacen que un horario no se pueda pedir. */
const OCUPAN: Reserva["estado"][] = ["pendiente", "confirmada", "bloqueo"];

/** Referencia estable para el render del servidor: sin esto, useSyncExternalStore
 *  entra en loop porque cada llamada devolvería un array distinto. */
const VACIO: Reserva[] = [];

let cache: Reserva[] | null = null;
const oyentes = new Set<() => void>();

function leerDisco(): Reserva[] {
  try {
    const guardado = window.localStorage.getItem(CLAVE_LS);
    if (guardado) {
      const datos = JSON.parse(guardado) as Reserva[];
      if (Array.isArray(datos) && datos.length > 0) return datos;
    }
  } catch {
    // JSON corrupto o storage bloqueado: arrancamos de la semilla.
  }
  // Se persiste al generarla, no recién con la primera reserva: si no, la
  // agenda de ejemplo se rearma en cada carga y cualquier cosa que dependa del
  // reloj (qué turnos ya pasaron) se correría sola entre pantalla y pantalla.
  const semilla = generarSemilla();
  escribirDisco(semilla);
  return semilla;
}

function escribirDisco(datos: Reserva[]) {
  try {
    window.localStorage.setItem(CLAVE_LS, JSON.stringify(datos));
  } catch {
    // Modo incógnito o storage lleno: la demo sigue andando en memoria.
  }
}

export function instantanea(): Reserva[] {
  if (cache === null) cache = leerDisco();
  return cache;
}

/** En el servidor todavía no hay datos: las pantallas muestran el esqueleto. */
export function instantaneaServidor(): Reserva[] {
  return VACIO;
}

export function suscribir(alCambiar: () => void): () => void {
  oyentes.add(alCambiar);
  return () => {
    oyentes.delete(alCambiar);
  };
}

function actualizar(cambio: (previas: Reserva[]) => Reserva[]) {
  cache = cambio(instantanea());
  escribirDisco(cache);
  for (const o of oyentes) o();
}

function nuevoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Reserva vigente de cada celda de la grilla, indexada por idSlot(). */
export function indexarPorSlot(reservas: Reserva[]): Map<string, Reserva> {
  const mapa = new Map<string, Reserva>();
  for (const r of reservas) {
    if (!OCUPAN.includes(r.estado)) continue;
    mapa.set(idSlot(r.jornada, r.bloque), r);
  }
  return mapa;
}

export function solicitar(n: NuevaSolicitud): { ok: boolean; motivo?: string } {
  // Chequeo optimista, alcanza para la demo. Contra Supabase esto lo resuelve
  // un constraint de exclusión en Postgres, que es lo único que aguanta dos
  // personas tocando el mismo horario en el mismo instante.
  if (indexarPorSlot(instantanea()).has(idSlot(n.jornada, n.bloque))) {
    return { ok: false, motivo: "Ese horario se acaba de ocupar." };
  }
  actualizar((previas) => [
    ...previas,
    {
      id: nuevoId(),
      canchaId: CANCHA_ID,
      jornada: n.jornada,
      bloque: n.bloque,
      inicio: inicioISO(n.jornada, n.bloque),
      estado: "pendiente",
      nombre: n.nombre.trim(),
      telefono: n.telefono.trim(),
      nota: n.nota?.trim() || undefined,
      creada: new Date().toISOString(),
    },
  ]);
  return { ok: true };
}

function cambiarEstado(id: string, estado: Reserva["estado"]) {
  actualizar((previas) =>
    previas.map((r) => (r.id === id ? { ...r, estado } : r)),
  );
}

export function confirmar(id: string) {
  cambiarEstado(id, "confirmada");
}

export function rechazar(id: string) {
  cambiarEstado(id, "rechazada");
}

export function eliminar(id: string) {
  actualizar((previas) => previas.filter((r) => r.id !== id));
}

export function bloquear(jornada: string, bloque: number, nota: string) {
  actualizar((previas) => [
    ...previas,
    {
      id: nuevoId(),
      canchaId: CANCHA_ID,
      jornada,
      bloque,
      inicio: inicioISO(jornada, bloque),
      estado: "bloqueo",
      nombre: "No disponible",
      telefono: "",
      nota: nota.trim() || undefined,
      creada: new Date().toISOString(),
    },
  ]);
}

export function reiniciar() {
  actualizar(() => generarSemilla());
}
