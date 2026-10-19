/**
 * Estadísticas de un torneo de vóley: equipos con sus jugadores, partidos
 * cargados jugada por jugada y, al final, los premios.
 *
 * Todo es puro, igual que lib/tablero.ts. Un partido no guarda el marcador:
 * guarda la lista de acciones y el marcador se rearma reproduciéndolas con las
 * mismas reglas del tablero. Así deshacer es sacar la última acción, y el
 * marcador nunca puede quedar desfasado de las estadísticas.
 */

import { anotar, otro, partidoNuevo, type Equipo as Lado, type Jugada, type Partido as Marcador } from "./tablero";

export type { Lado };

/* ───────────────────────────── Catálogo de acciones ───────────────────────────── */

export type Fundamento = "saque" | "recepcion" | "armado" | "ataque" | "bloqueo" | "defensa";

/**
 * Qué le hace la acción al marcador:
 * - "punto": suma el equipo del jugador.
 * - "error": suma el rival.
 * - null: la jugada sigue, sólo cuenta para las estadísticas.
 */
export type Efecto = "punto" | "error" | null;

export interface TipoAccion {
  clave: string;
  etiqueta: string;
  /** Para la cabecera de la tabla de estadísticas. */
  corta: string;
  efecto: Efecto;
}

/** En el orden en que pasan en una jugada, que es como se muestran los botones. */
export const FUNDAMENTOS: { clave: Fundamento; etiqueta: string; tipos: TipoAccion[] }[] = [
  {
    clave: "saque",
    etiqueta: "Saque",
    tipos: [
      { clave: "ace", etiqueta: "Ace", corta: "Ace", efecto: "punto" },
      { clave: "enjuego", etiqueta: "En juego", corta: "OK", efecto: null },
      { clave: "error", etiqueta: "Error", corta: "Err", efecto: "error" },
    ],
  },
  {
    clave: "recepcion",
    etiqueta: "Recepción",
    tipos: [
      { clave: "perfecta", etiqueta: "Perfecta", corta: "Perf", efecto: null },
      { clave: "buena", etiqueta: "Buena", corta: "Bue", efecto: null },
      { clave: "mala", etiqueta: "Mala", corta: "Mal", efecto: null },
      { clave: "error", etiqueta: "Error", corta: "Err", efecto: "error" },
    ],
  },
  {
    // La asistencia no mueve el marcador: el punto ya lo anota el ataque.
    clave: "armado",
    etiqueta: "Armado",
    tipos: [
      { clave: "asistencia", etiqueta: "Asistencia", corta: "Asis", efecto: null },
      { clave: "buena", etiqueta: "Buena", corta: "Bue", efecto: null },
      { clave: "error", etiqueta: "Error", corta: "Err", efecto: "error" },
    ],
  },
  {
    clave: "ataque",
    etiqueta: "Ataque",
    tipos: [
      { clave: "punto", etiqueta: "Punto", corta: "Pto", efecto: "punto" },
      { clave: "enjuego", etiqueta: "En juego", corta: "OK", efecto: null },
      { clave: "error", etiqueta: "Error", corta: "Err", efecto: "error" },
    ],
  },
  {
    clave: "bloqueo",
    etiqueta: "Bloqueo",
    tipos: [
      { clave: "punto", etiqueta: "Punto", corta: "Pto", efecto: "punto" },
      { clave: "toque", etiqueta: "Toque", corta: "Toq", efecto: null },
      { clave: "error", etiqueta: "Error", corta: "Err", efecto: "error" },
    ],
  },
  {
    // Buena: la levantó y se pudo seguir jugando. Mala: la tocó pero no quedó
    // jugable. Error: no la levantó, punto del rival.
    clave: "defensa",
    etiqueta: "Defensa",
    tipos: [
      { clave: "buena", etiqueta: "Buena", corta: "Bue", efecto: null },
      { clave: "mala", etiqueta: "Mala", corta: "Mal", efecto: null },
      { clave: "error", etiqueta: "Error", corta: "Err", efecto: "error" },
    ],
  },
];

export function tipoAccion(f: Fundamento, clave: string): TipoAccion | undefined {
  return FUNDAMENTOS.find((x) => x.clave === f)?.tipos.find((t) => t.clave === clave);
}

/* ───────────────────────────── Datos ───────────────────────────── */

export interface Jugador {
  id: string;
  nombre: string;
  numero: string;
}

export interface Equipo {
  id: string;
  nombre: string;
  jugadores: Jugador[];
}

/**
 * Una acción del partido. Sin `jugador` es un punto que no se le anota a nadie
 * (un error del rival que no se cargó, una falta de rotación, etc.): sólo mueve
 * el marcador.
 */
export type Accion =
  | { id: string; lado: Lado; jugador: string; fundamento: Fundamento; tipo: string }
  | { id: string; lado: Lado; jugador: null; fundamento: null; tipo: "punto" };

export interface PartidoTorneo {
  id: string;
  local: string;
  visita: string;
  setsParaGanar: 2 | 3;
  creado: number;
  acciones: Accion[];
}

export interface Torneo {
  nombre: string;
  /** Formato con el que arrancan los partidos nuevos: 2 = al mejor de 3, 3 = al mejor de 5. */
  setsParaGanar: 2 | 3;
  equipos: Equipo[];
  partidos: PartidoTorneo[];
}

export function torneoNuevo(): Torneo {
  return { nombre: "Torneo Matter", setsParaGanar: 2, equipos: [], partidos: [] };
}

export function nuevoId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Completa lo que no tenían los torneos guardados con una versión anterior.
 * Hay que pasarle algo que ya pasó por `esTorneo`.
 */
export function normalizar(t: Torneo): Torneo {
  return { ...t, setsParaGanar: t.setsParaGanar === 3 ? 3 : 2 };
}

/** Lo mínimo para no dibujar algo que rompa la pantalla (un guardado viejo, un archivo ajeno). */
export function esTorneo(x: unknown): x is Torneo {
  const t = x as Torneo;
  return (
    typeof t?.nombre === "string" &&
    Array.isArray(t.equipos) &&
    Array.isArray(t.partidos) &&
    t.equipos.every((e) => typeof e?.id === "string" && Array.isArray(e.jugadores)) &&
    t.partidos.every((p) => typeof p?.id === "string" && Array.isArray(p.acciones))
  );
}

/* ───────────────────────────── Marcador ───────────────────────────── */

function jugadaDelTablero(a: Accion): Jugada {
  if (a.fundamento === "saque" && a.tipo === "ace") return "ace";
  if (a.fundamento === "bloqueo" && a.tipo === "punto") return "bloqueo";
  return "punto";
}

/** Qué lado suma con esta acción, o null si la jugada sigue. */
export function ladoQueSuma(a: Accion): Lado | null {
  const efecto = a.fundamento === null ? "punto" : tipoAccion(a.fundamento, a.tipo)?.efecto;
  if (efecto === "punto") return a.lado;
  if (efecto === "error") return otro(a.lado);
  return null;
}

/** Rearma el marcador del partido a partir de sus acciones. */
export function marcador(t: Torneo, p: PartidoTorneo): Marcador {
  const base = partidoNuevo();
  let m: Marcador = {
    ...base,
    nombres: { local: nombreEquipo(t, p.local), visita: nombreEquipo(t, p.visita) },
    setsParaGanar: p.setsParaGanar,
  };
  for (const a of p.acciones) {
    const lado = ladoQueSuma(a);
    if (!lado) continue;
    const r = anotar(m, lado, jugadaDelTablero(a));
    if (r) m = r.partido;
  }
  return m;
}

export function nombreEquipo(t: Torneo, id: string): string {
  return t.equipos.find((e) => e.id === id)?.nombre ?? "Equipo borrado";
}

/* ───────────────────────────── Estadísticas ───────────────────────────── */

export type Conteo = Record<Fundamento, Record<string, number>>;

export interface Estadistica {
  jugador: Jugador;
  equipo: Equipo;
  conteo: Conteo;
  /** Ataque + bloqueo + ace. */
  puntos: number;
  errores: number;
  recepciones: number;
  /** Promedio de recepción de 0 a 3 (perfecta 3, buena 2, mala 1, error 0). */
  promedioRecepcion: number | null;
}

function conteoVacio(): Conteo {
  const c = {} as Conteo;
  for (const f of FUNDAMENTOS) c[f.clave] = Object.fromEntries(f.tipos.map((t) => [t.clave, 0]));
  return c;
}

const VALOR_RECEPCION: Record<string, number> = { perfecta: 3, buena: 2, mala: 1, error: 0 };

/**
 * Las estadísticas de cada jugador, sumando los partidos pedidos (todos si no
 * se pasa ninguno).
 */
export function estadisticas(t: Torneo, partidos: PartidoTorneo[] = t.partidos): Estadistica[] {
  const porJugador = new Map<string, Conteo>();
  for (const p of partidos) {
    for (const a of p.acciones) {
      if (a.jugador === null) continue;
      const c = porJugador.get(a.jugador) ?? conteoVacio();
      if (a.tipo in c[a.fundamento]) c[a.fundamento][a.tipo] += 1;
      porJugador.set(a.jugador, c);
    }
  }

  return t.equipos.flatMap((equipo) =>
    equipo.jugadores.map((jugador) => {
      const c = porJugador.get(jugador.id) ?? conteoVacio();
      const r = c.recepcion;
      const recepciones = r.perfecta + r.buena + r.mala + r.error;
      const suma = Object.entries(r).reduce((s, [k, n]) => s + VALOR_RECEPCION[k] * n, 0);
      return {
        jugador,
        equipo,
        conteo: c,
        puntos: c.ataque.punto + c.bloqueo.punto + c.saque.ace,
        errores: FUNDAMENTOS.reduce((s, f) => s + c[f.clave].error, 0),
        recepciones,
        promedioRecepcion: recepciones ? suma / recepciones : null,
      };
    }),
  );
}

/* ───────────────────────────── Premios ───────────────────────────── */

/**
 * Para el premio a la recepción hay que haber recibido un mínimo: si no, uno
 * que recibió una sola pelota y la dejó perfecta le gana a todos.
 */
export const MIN_RECEPCIONES = 8;

export interface Premio {
  titulo: string;
  criterio: string;
  /** Hasta tres, del primero al tercero. */
  podio: { e: Estadistica; valor: string }[];
}

/**
 * Ordena por `valor` (más es mejor) y desempata por `desempate` (más es
 * mejor). Quedan afuera los que no sumaron nada en esa categoría.
 */
function podio(
  todos: Estadistica[],
  valor: (e: Estadistica) => number | null,
  desempate: (e: Estadistica) => number,
  mostrar: (e: Estadistica) => string,
): Premio["podio"] {
  return todos
    .filter((e) => {
      const v = valor(e);
      return v !== null && v > 0;
    })
    .sort((a, b) => valor(b)! - valor(a)! || desempate(b) - desempate(a))
    .slice(0, 3)
    .map((e) => ({ e, valor: mostrar(e) }));
}

function cuantos(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

export function premios(todos: Estadistica[]): Premio[] {
  return [
    {
      titulo: "Mejor saque",
      criterio: "Aces. Desempata quien cometió menos errores de saque.",
      podio: podio(
        todos,
        (e) => e.conteo.saque.ace,
        (e) => -e.conteo.saque.error,
        (e) => cuantos(e.conteo.saque.ace, "ace", "aces"),
      ),
    },
    {
      titulo: "Mejor armador",
      criterio: "Asistencias (armados que terminaron en punto). Desempata quien cometió menos errores de armado.",
      podio: podio(
        todos,
        (e) => e.conteo.armado.asistencia,
        (e) => -e.conteo.armado.error,
        (e) => cuantos(e.conteo.armado.asistencia, "asistencia", "asistencias"),
      ),
    },
    {
      titulo: "Mejor receptor",
      criterio: `Promedio de recepción de 0 a 3, con al menos ${MIN_RECEPCIONES} recepciones. Desempata quien recibió más.`,
      podio: podio(
        todos,
        (e) => (e.recepciones >= MIN_RECEPCIONES ? e.promedioRecepcion : null),
        (e) => e.recepciones,
        (e) => `${e.promedioRecepcion!.toFixed(2)} en ${e.recepciones}`,
      ),
    },
    {
      titulo: "Mejor defensa",
      criterio: "Defensas buenas (pelotas levantadas que siguieron en juego). Desempata quien cometió menos errores de defensa.",
      podio: podio(
        todos,
        (e) => e.conteo.defensa.buena,
        (e) => -e.conteo.defensa.error,
        (e) => cuantos(e.conteo.defensa.buena, "defensa", "defensas"),
      ),
    },
    {
      titulo: "Mejor bloqueador",
      criterio: "Puntos de bloqueo. Desempata quien tocó más bloqueos.",
      podio: podio(
        todos,
        (e) => e.conteo.bloqueo.punto,
        (e) => e.conteo.bloqueo.toque,
        (e) => cuantos(e.conteo.bloqueo.punto, "bloqueo", "bloqueos"),
      ),
    },
    {
      titulo: "Mejor ataque",
      criterio: "Puntos de ataque. Desempata quien cometió menos errores de ataque.",
      podio: podio(
        todos,
        (e) => e.conteo.ataque.punto,
        (e) => -e.conteo.ataque.error,
        (e) => cuantos(e.conteo.ataque.punto, "punto", "puntos"),
      ),
    },
  ];
}
