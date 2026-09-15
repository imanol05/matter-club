/**
 * Almacén de la demo: un store a nivel módulo, sin React.
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

import {
  CANCHA_ID,
  type Espera,
  type NuevaSolicitud,
  type NuevoFijo,
  type Ocupacion,
  type Reserva,
  type TurnoFijo,
} from "./tipos";
import { claveFecha, diaSemana, idSlot, inicioISO } from "./horarios";
import { generarSemilla } from "./semilla";

/** Subir la versión cuando cambie la forma de los datos: si no, quedan
 *  reservas guardadas apuntando a bloques o campos que ya no existen. */
const CLAVE_LS = "matter-club:datos:v3";

/** Estados que hacen que un horario no se pueda pedir. */
const OCUPAN: Reserva["estado"][] = ["pendiente", "confirmada", "bloqueo"];

export type Datos = {
  reservas: Reserva[];
  fijos: TurnoFijo[];
  esperas: Espera[];
};

/** Referencia estable para el render del servidor: sin esto,
 *  useSyncExternalStore entra en loop porque cada llamada devolvería un objeto
 *  distinto. */
const VACIO: Datos = { reservas: [], fijos: [], esperas: [] };

let cache: Datos | null = null;
const oyentes = new Set<() => void>();

function leerDisco(): Datos {
  try {
    const guardado = window.localStorage.getItem(CLAVE_LS);
    if (guardado) {
      // Partial a propósito: lo que hay en el storage lo puede haber escrito
      // una versión anterior o alguien a mano, así que se completa campo a
      // campo en vez de confiar en que tenga la forma actual.
      const datos = JSON.parse(guardado) as Partial<Datos>;
      if (Array.isArray(datos?.reservas)) {
        return {
          reservas: datos.reservas,
          fijos: datos.fijos ?? [],
          esperas: datos.esperas ?? [],
        };
      }
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

function escribirDisco(datos: Datos) {
  try {
    window.localStorage.setItem(CLAVE_LS, JSON.stringify(datos));
  } catch {
    // Modo incógnito o storage lleno: la demo sigue andando en memoria.
  }
}

export function instantanea(): Datos {
  if (cache === null) cache = leerDisco();
  return cache;
}

/** En el servidor todavía no hay datos: las pantallas muestran el esqueleto. */
export function instantaneaServidor(): Datos {
  return VACIO;
}

export function suscribir(alCambiar: () => void): () => void {
  oyentes.add(alCambiar);
  return () => {
    oyentes.delete(alCambiar);
  };
}

function actualizar(cambio: (previos: Datos) => Datos) {
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

/**
 * Devuelve una función que dice quién tiene tomado cada bloque.
 *
 * Los turnos fijos se expanden acá, al consultarse, en vez de guardarse semana
 * por semana. Una reserva concreta le gana al fijo: si alguien ya tenía tomado
 * ese día puntual antes de que existiera la regla, el que estaba primero manda.
 */
export function crearBuscador(datos: Datos) {
  const porSlot = new Map<string, Reserva>();
  for (const r of datos.reservas) {
    if (!OCUPAN.includes(r.estado)) continue;
    porSlot.set(idSlot(r.jornada, r.bloque), r);
  }

  const fijosPorHueco = new Map<string, TurnoFijo[]>();
  for (const f of datos.fijos) {
    const clave = `${f.diaSemana}#${f.bloque}`;
    const lista = fijosPorHueco.get(clave);
    if (lista) lista.push(f);
    else fijosPorHueco.set(clave, [f]);
  }

  return (jornada: string, bloque: number): Ocupacion | undefined => {
    const reserva = porSlot.get(idSlot(jornada, bloque));
    if (reserva) return { tipo: "reserva", reserva };

    const candidatos = fijosPorHueco.get(`${diaSemana(jornada)}#${bloque}`);
    // Las claves son YYYY-MM-DD, así que alcanza con comparar como texto.
    const fijo = candidatos?.find(
      (f) => jornada >= f.desde && (f.hasta === null || jornada <= f.hasta),
    );
    return fijo ? { tipo: "fijo", fijo } : undefined;
  };
}

export function solicitar(n: NuevaSolicitud): { ok: boolean; motivo?: string } {
  // Chequeo optimista, alcanza para la demo. Contra Supabase esto lo resuelve
  // un constraint de exclusión en Postgres, que es lo único que aguanta dos
  // personas tocando el mismo horario en el mismo instante.
  if (crearBuscador(instantanea())(n.jornada, n.bloque)) {
    return { ok: false, motivo: "Ese horario se acaba de ocupar." };
  }
  actualizar((previos) => ({
    ...previos,
    reservas: [
      ...previos.reservas,
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
    ],
  }));
  return { ok: true };
}

function cambiarEstado(id: string, estado: Reserva["estado"]) {
  actualizar((previos) => ({
    ...previos,
    reservas: previos.reservas.map((r) => (r.id === id ? { ...r, estado } : r)),
  }));
}

export function confirmar(id: string) {
  cambiarEstado(id, "confirmada");
}

export function rechazar(id: string) {
  cambiarEstado(id, "rechazada");
}

export function eliminar(id: string) {
  actualizar((previos) => ({
    ...previos,
    reservas: previos.reservas.filter((r) => r.id !== id),
  }));
}

export function bloquear(jornada: string, bloque: number, nota: string) {
  actualizar((previos) => ({
    ...previos,
    reservas: [
      ...previos.reservas,
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
    ],
  }));
}

export function crearFijo(n: NuevoFijo) {
  actualizar((previos) => ({
    ...previos,
    fijos: [
      ...previos.fijos,
      {
        id: nuevoId(),
        canchaId: CANCHA_ID,
        diaSemana: n.diaSemana,
        bloque: n.bloque,
        nombre: n.nombre.trim(),
        telefono: n.telefono.trim(),
        desde: n.desde,
        hasta: null,
        creado: new Date().toISOString(),
      },
    ],
  }));
}

/**
 * Corta un turno fijo a partir de mañana, en vez de borrarlo.
 *
 * Dos decisiones acá:
 *
 * - Se marca `hasta` y no se borra la fila: las semanas pasadas tienen que
 *   seguir mostrándolo, porque ese grupo efectivamente jugó. Borrar la regla
 *   reescribiría la historia de la grilla.
 * - Vale hasta hoy inclusive, no hasta ayer: si el encargado da de baja el
 *   turno de los martes un martes a la mañana, el grupo igual juega esa noche.
 *   Sacarles el turno el mismo día sería una sorpresa desagradable.
 */
export function darDeBajaFijo(id: string) {
  const hoy = claveFecha(new Date());
  actualizar((previos) => ({
    ...previos,
    fijos: previos.fijos.map((f) => (f.id === id ? { ...f, hasta: hoy } : f)),
  }));
}

export function anotarEnEspera(e: Omit<Espera, "id" | "canchaId" | "creada">) {
  actualizar((previos) => ({
    ...previos,
    esperas: [
      ...previos.esperas,
      {
        ...e,
        id: nuevoId(),
        canchaId: CANCHA_ID,
        nombre: e.nombre.trim(),
        telefono: e.telefono.trim(),
        creada: new Date().toISOString(),
      },
    ],
  }));
}

export function quitarEspera(id: string) {
  actualizar((previos) => ({
    ...previos,
    esperas: previos.esperas.filter((e) => e.id !== id),
  }));
}

export function reiniciar() {
  actualizar(() => generarSemilla());
}
