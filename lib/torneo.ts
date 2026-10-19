/**
 * Estadísticas de un torneo de vóley: equipos con sus jugadores, partidos
 * cargados jugada por jugada y, al final, los premios.
 *
 * Todo es puro, igual que lib/tablero.ts. Un partido no guarda el marcador:
 * guarda la lista de acciones y el marcador se rearma reproduciéndolas con las
 * mismas reglas del tablero. Así deshacer es sacar la última acción, y el
 * marcador nunca puede quedar desfasado de las estadísticas.
 */

import {
  anotar,
  otro,
  partidoNuevo,
  type Equipo as Lado,
  type Jugada,
  type Partido as Marcador,
  type Resultado,
} from "./tablero";

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
  /** El líbero del plantel, si tienen. Entra solo cuando le toca atrás (ver LugarRotacion). */
  liberoId?: string;
}

/**
 * Una acción del partido. Sin `jugador` es un punto que no se le anota a nadie
 * (un error del rival que no se cargó, una falta de rotación, etc.): sólo mueve
 * el marcador.
 *
 * Una misma pelota puede dejar varias acciones: el ace y el error de
 * recepción del otro lado, el ataque y la asistencia. Van juntas en un `grupo`
 * (el id de la primera), para deshacerlas de una vez. Las que tienen `ligada`
 * cuentan para las estadísticas pero no mueven el marcador, porque ese punto
 * ya lo sumó otra acción del grupo.
 */
export type Accion = { id: string; lado: Lado; grupo?: string; ligada?: true } & (
  | { jugador: string; fundamento: Fundamento; tipo: string }
  | { jugador: null; fundamento: null; tipo: "punto" }
);

/** En qué parte del torneo se juega el partido. Sin ronda es un amistoso suelto. */
export type Ronda = "zonaA" | "zonaB" | "semi1" | "semi2" | "tercero" | "final";

export const NOMBRE_RONDA: Record<Ronda, string> = {
  zonaA: "Zona A",
  zonaB: "Zona B",
  semi1: "Semifinal 1",
  semi2: "Semifinal 2",
  tercero: "3er puesto",
  final: "Final",
};

/**
 * Un lugar de la rotación: quién lo ocupa. Si tiene `libero`, cuando ese lugar
 * le toca atrás juega el líbero en vez del titular (ver `LUGARES_ATRAS`); el
 * líbero nunca juega adelante, así que no hace falta impedirlo a mano.
 */
export interface LugarRotacion {
  titular: string;
  libero?: string;
}

export interface PartidoTorneo {
  id: string;
  local: string;
  visita: string;
  setsParaGanar: 2 | 3;
  creado: number;
  acciones: Accion[];
  ronda?: Ronda;
  /**
   * Los 6 lugares de cada lado, en orden de rotación (el [0] es el que saca).
   * Sin dato, los primeros seis de la lista, sin rotar y sin líbero.
   */
  alineacion?: Partial<Record<Lado, LugarRotacion[]>>;
}

export interface Torneo {
  nombre: string;
  /** Formato con el que arrancan los partidos nuevos: 2 = al mejor de 3, 3 = al mejor de 5. */
  setsParaGanar: 2 | 3;
  equipos: Equipo[];
  partidos: PartidoTorneo[];
  /** Ids de los equipos de cada zona, cuando ya se armó el fixture. */
  zonas?: { A: string[]; B: string[] };
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

/**
 * Rearma el marcador del partido a partir de sus acciones. `ultimo` es lo que
 * pasó con el último punto y en qué acción, para el festejo de la tele.
 */
export function repasar(
  t: Torneo,
  p: PartidoTorneo,
): { marcador: Marcador; ultimo: { indice: number; resultado: Resultado } | null } {
  let m: Marcador = {
    ...partidoNuevo(),
    nombres: { local: nombreEquipo(t, p.local), visita: nombreEquipo(t, p.visita) },
    setsParaGanar: p.setsParaGanar,
  };
  let ultimo: { indice: number; resultado: Resultado } | null = null;
  p.acciones.forEach((a, indice) => {
    const lado = a.ligada ? null : ladoQueSuma(a);
    if (!lado) return;
    const r = anotar(m, lado, jugadaDelTablero(a));
    if (!r) return;
    m = r.partido;
    ultimo = { indice, resultado: r.resultado };
  });
  return { marcador: m, ultimo };
}

export function marcador(t: Torneo, p: PartidoTorneo): Marcador {
  return repasar(t, p).marcador;
}

/** Cuántas acciones del final forman la última jugada, para deshacerla entera. */
export function largoUltimaJugada(acciones: Accion[]): number {
  const ultima = acciones.at(-1);
  if (!ultima) return 0;
  const grupo = ultima.grupo ?? ultima.id;
  let n = 0;
  for (let i = acciones.length - 1; i >= 0 && (acciones[i].grupo ?? acciones[i].id) === grupo; i--) n++;
  return n;
}

/* ───────────────────────────── Jugadas encadenadas ───────────────────────────── */

/**
 * Lo que la app pregunta después de una acción para completar la misma
 * pelota: después de un ace, quién no pudo recibir; después de un punto de
 * ataque, quién armó y quién no pudo defender. Así no hay que acordarse de
 * anotar las dos caras, y el punto no se cuenta dos veces.
 */
export interface Pregunta {
  texto: string;
  /** El lado del jugador que se pregunta, relativo al de la acción original. */
  mismoLado: boolean;
  fundamento: Fundamento;
  tipo: string;
}

const PREGUNTAS: Record<string, Pregunta[]> = {
  "saque:ace": [{ texto: "¿Quién no pudo recibir?", mismoLado: false, fundamento: "recepcion", tipo: "error" }],
  "recepcion:error": [{ texto: "¿Quién hizo el ace?", mismoLado: false, fundamento: "saque", tipo: "ace" }],
  "ataque:punto": [
    { texto: "¿Quién armó?", mismoLado: true, fundamento: "armado", tipo: "asistencia" },
    { texto: "¿Quién no la pudo defender?", mismoLado: false, fundamento: "defensa", tipo: "error" },
  ],
  "armado:asistencia": [
    { texto: "¿Quién hizo el punto?", mismoLado: true, fundamento: "ataque", tipo: "punto" },
    { texto: "¿Quién no la pudo defender?", mismoLado: false, fundamento: "defensa", tipo: "error" },
  ],
  "defensa:error": [
    { texto: "¿Quién hizo el punto?", mismoLado: false, fundamento: "ataque", tipo: "punto" },
    { texto: "¿Quién armó?", mismoLado: false, fundamento: "armado", tipo: "asistencia" },
  ],
  "bloqueo:punto": [{ texto: "¿A quién bloquearon?", mismoLado: false, fundamento: "ataque", tipo: "error" }],
  "ataque:error": [{ texto: "¿Lo bloqueó alguien?", mismoLado: false, fundamento: "bloqueo", tipo: "punto" }],
};

export function preguntasDespues(f: Fundamento, tipo: string): Pregunta[] {
  return PREGUNTAS[`${f}:${tipo}`] ?? [];
}

/**
 * La acción que sale de contestar una pregunta. `yaSumo` dice si alguna acción
 * anterior de la misma pelota ya movió el marcador: si es así, esta queda
 * ligada para no sumar el mismo punto dos veces.
 */
export function respuesta(
  original: Accion,
  pregunta: Pregunta,
  jugador: string,
  yaSumo: boolean,
): Accion {
  const tipo = tipoAccion(pregunta.fundamento, pregunta.tipo);
  return {
    id: nuevoId(),
    grupo: original.grupo ?? original.id,
    lado: pregunta.mismoLado ? original.lado : otro(original.lado),
    jugador,
    fundamento: pregunta.fundamento,
    tipo: pregunta.tipo,
    ...(yaSumo && tipo?.efecto ? { ligada: true as const } : {}),
  };
}

/* ───────────────────────────── Rotación y líbero ───────────────────────────── */

/**
 * Los lugares 1, 6 y 5 son los de atrás (reciben, y ahí es donde puede entrar
 * el líbero); el resto, el 2, el 3 y el 4, son los de adelante. Se cuentan por
 * índice (0 = lugar 1), que es el orden en que se guarda la alineación.
 */
const LUGARES_ATRAS = [0, 4, 5];

function alineacionPorDefecto(equipo: Equipo): LugarRotacion[] {
  return equipo.jugadores.slice(0, 6).map((j) => ({ titular: j.id }));
}

/** Un lugar de la rotación, ya resuelto: quién juega ahí ahora mismo. */
export interface LugarEnJuego {
  /** 0 a 5; el [0] es el que saca. */
  indice: number;
  atras: boolean;
  jugador?: Jugador;
  esLibero: boolean;
  /** El titular, cuando el que está jugando ahí es el líbero. */
  suplantado?: Jugador;
}

/** Los 6 lugares de un lado, resolviendo a quién le toca jugar en cada uno. */
export function alineacionEnJuego(p: PartidoTorneo, equipo: Equipo | undefined, lado: Lado): LugarEnJuego[] {
  if (!equipo) return [];
  const porId = new Map(equipo.jugadores.map((j) => [j.id, j]));
  const lugares = p.alineacion?.[lado] ?? alineacionPorDefecto(equipo);
  return lugares.map((lugar, indice) => {
    const atras = LUGARES_ATRAS.includes(indice);
    const esLibero = atras && !!lugar.libero;
    return {
      indice,
      atras,
      jugador: porId.get(esLibero ? lugar.libero! : lugar.titular),
      esLibero,
      suplantado: esLibero ? porId.get(lugar.titular) : undefined,
    };
  });
}

/** Los jugadores que están jugando ahora en un lado (resuelto el líbero), para elegir a quién le pasó algo. */
export function enCancha(p: PartidoTorneo, equipo: Equipo | undefined, lado: Lado): Jugador[] {
  return alineacionEnJuego(p, equipo, lado)
    .map((l) => l.jugador)
    .filter((j): j is Jugador => !!j);
}

/**
 * Si alguien recuperó el saque recién (pasó de no sacar a sacar), toca rotar.
 * `anterior` es el saque antes del último punto cargado; si todavía no sacó
 * nadie (arranque del partido) no cuenta como rotación, es el primer saque.
 */
export function debeRotar(anterior: Lado | null, actual: Lado | null): Lado | null {
  return anterior && actual && actual !== anterior ? actual : null;
}

/** El lugar 2 pasa a sacar; el resto se corre uno, y el que sacaba va al final. */
export function rotar(lugares: LugarRotacion[]): LugarRotacion[] {
  return [...lugares.slice(1), lugares[0]];
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
 *
 * El mínimo es un tercio de lo que recibió el que más recibió (y nunca menos
 * de 3), así se acomoda solo a un torneo corto o largo.
 */
export function minimoRecepciones(todos: Estadistica[]): number {
  const mas = Math.max(0, ...todos.map((e) => e.recepciones));
  return Math.max(3, Math.ceil(mas / 3));
}

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
  const minimo = minimoRecepciones(todos);
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
      criterio: `Promedio de recepción de 0 a 3 (perfecta 3, buena 2, mala 1, error 0). Compiten los que recibieron al menos ${minimo} pelotas. Desempata quien recibió más.`,
      podio: podio(
        todos,
        (e) => (e.recepciones >= minimo ? e.promedioRecepcion : null),
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

/* ───────────────────────────── Fixture ───────────────────────────── */

/**
 * El torneo de 8 equipos: dos zonas de 4, todos contra todos dentro de cada
 * zona. Pasan los dos primeros: semis cruzadas (1°A–2°B y 1°B–2°A), y después
 * final y 3er puesto.
 */
export const EQUIPOS_POR_ZONA = 4;

/** Las tres fechas de una zona de 4: cada uno juega una vez con cada otro. */
const CRUCES_ZONA: [number, number][] = [
  [0, 3],
  [1, 2],
  [0, 2],
  [3, 1],
  [0, 1],
  [2, 3],
];

export function partidosDeZona(t: Torneo, ronda: "zonaA" | "zonaB"): PartidoTorneo[] {
  const ids = t.zonas?.[ronda === "zonaA" ? "A" : "B"] ?? [];
  const ahora = Date.now();
  return CRUCES_ZONA.map(([a, b], i) => ({
    id: nuevoId() + i,
    local: ids[a],
    visita: ids[b],
    setsParaGanar: t.setsParaGanar,
    creado: ahora + i,
    acciones: [],
    ronda,
  }));
}

export interface Posicion {
  equipo: string;
  jugados: number;
  ganados: number;
  perdidos: number;
  puntos: number;
  setsAFavor: number;
  setsEnContra: number;
  tantosAFavor: number;
  tantosEnContra: number;
}

/**
 * Lo que da cada partido terminado, como la FIVB: el que gana sin llegar al
 * set decisivo se lleva 3 y el otro 0; si se define en el decisivo, 2 y 1.
 */
function puntosDelPartido(m: Marcador, lado: Lado): number {
  const gano = m.ganador === lado;
  const perdedor = m.sets[otro(m.ganador!)];
  const decisivo = perdedor === m.setsParaGanar - 1;
  if (gano) return decisivo ? 2 : 3;
  return decisivo ? 1 : 0;
}

/** Compara a/b contra c/d sin dividir por cero: 3/0 le gana a 5/1. */
function cocienteMayor(a: number, b: number, c: number, d: number): number {
  return a * d - c * b;
}

/**
 * La tabla de posiciones de una zona. Ordena por puntos, después por el
 * cociente de sets y después por el de tantos. Sólo cuentan los partidos
 * terminados.
 */
export function posiciones(t: Torneo, ronda: "zonaA" | "zonaB"): Posicion[] {
  const ids = t.zonas?.[ronda === "zonaA" ? "A" : "B"] ?? [];
  const tabla = new Map<string, Posicion>(
    ids.map((equipo) => [
      equipo,
      {
        equipo,
        jugados: 0,
        ganados: 0,
        perdidos: 0,
        puntos: 0,
        setsAFavor: 0,
        setsEnContra: 0,
        tantosAFavor: 0,
        tantosEnContra: 0,
      },
    ]),
  );

  for (const p of t.partidos.filter((x) => x.ronda === ronda)) {
    const m = marcador(t, p);
    if (!m.ganador) continue;
    for (const lado of ["local", "visita"] as const) {
      const fila = tabla.get(p[lado]);
      if (!fila) continue;
      const rival = otro(lado);
      fila.jugados++;
      if (m.ganador === lado) fila.ganados++;
      else fila.perdidos++;
      fila.puntos += puntosDelPartido(m, lado);
      fila.setsAFavor += m.sets[lado];
      fila.setsEnContra += m.sets[rival];
      for (const s of m.jugados) {
        fila.tantosAFavor += s[lado];
        fila.tantosEnContra += s[rival];
      }
    }
  }

  return [...tabla.values()].sort(
    (a, b) =>
      b.puntos - a.puntos ||
      cocienteMayor(b.setsAFavor, b.setsEnContra, a.setsAFavor, a.setsEnContra) ||
      cocienteMayor(b.tantosAFavor, b.tantosEnContra, a.tantosAFavor, a.tantosEnContra),
  );
}

export function rondaTerminada(t: Torneo, rondas: Ronda[]): boolean {
  const ps = t.partidos.filter((p) => p.ronda && rondas.includes(p.ronda));
  return ps.length > 0 && ps.every((p) => marcador(t, p).ganador !== null);
}

/** Ganador y perdedor de un partido de eliminación ya terminado. */
export function resultadoDe(t: Torneo, ronda: Ronda): { ganador: string; perdedor: string } | null {
  const p = t.partidos.find((x) => x.ronda === ronda);
  if (!p) return null;
  const m = marcador(t, p);
  if (!m.ganador) return null;
  return { ganador: p[m.ganador], perdedor: p[otro(m.ganador)] };
}

function partidoDeRonda(t: Torneo, ronda: Ronda, local: string, visita: string, i: number): PartidoTorneo {
  return {
    id: nuevoId() + i,
    local,
    visita,
    setsParaGanar: t.setsParaGanar,
    creado: Date.now() + i,
    acciones: [],
    ronda,
  };
}

/** Las semis, con los dos primeros de cada zona cruzados. */
export function semifinales(t: Torneo): PartidoTorneo[] {
  const a = posiciones(t, "zonaA");
  const b = posiciones(t, "zonaB");
  return [
    partidoDeRonda(t, "semi1", a[0].equipo, b[1].equipo, 0),
    partidoDeRonda(t, "semi2", b[0].equipo, a[1].equipo, 1),
  ];
}

/** Final con los ganadores de las semis y 3er puesto con los perdedores. */
export function finales(t: Torneo): PartidoTorneo[] {
  const s1 = resultadoDe(t, "semi1")!;
  const s2 = resultadoDe(t, "semi2")!;
  return [
    partidoDeRonda(t, "tercero", s1.perdedor, s2.perdedor, 0),
    partidoDeRonda(t, "final", s1.ganador, s2.ganador, 1),
  ];
}
