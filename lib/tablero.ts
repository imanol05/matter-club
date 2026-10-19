/**
 * Reglas del tablero de vóley. Todo es puro: recibe un partido y devuelve otro,
 * así deshacer es tan simple como volver al anterior de la pila.
 *
 * Se juega con punto por jugada (rally point): el que gana la jugada suma y se
 * queda con el saque. Los sets van a 25 y el decisivo a 15, siempre con dos de
 * diferencia.
 */

export type Equipo = "local" | "visita";

/** Cómo se ganó el punto. Sólo cambia la animación, el punto vale lo mismo. */
export type Jugada = "punto" | "ace" | "bloqueo";

export interface SetJugado {
  local: number;
  visita: number;
}

export interface Partido {
  nombres: Record<Equipo, string>;
  puntos: Record<Equipo, number>;
  sets: Record<Equipo, number>;
  /** Resultados de los sets ya terminados, en orden. */
  jugados: SetJugado[];
  saque: Equipo | null;
  /** 2 = al mejor de 3, 3 = al mejor de 5. */
  setsParaGanar: 2 | 3;
  /** Cambio de lado: dibuja la visita a la izquierda. */
  invertido: boolean;
  ganador: Equipo | null;
}

/** Lo que pasó con el último punto, para decidir qué festejo mostrar. */
export type Resultado =
  | { tipo: "jugada"; jugada: Jugada; equipo: Equipo }
  | { tipo: "set"; jugada: Jugada; equipo: Equipo; set: SetJugado }
  | { tipo: "partido"; jugada: Jugada; equipo: Equipo; set: SetJugado };

export const PUNTOS_SET = 25;
export const PUNTOS_DECISIVO = 15;

export function otro(e: Equipo): Equipo {
  return e === "local" ? "visita" : "local";
}

export function partidoNuevo(previo?: Partido): Partido {
  return {
    nombres: previo?.nombres ?? { local: "Local", visita: "Visita" },
    puntos: { local: 0, visita: 0 },
    sets: { local: 0, visita: 0 },
    jugados: [],
    saque: null,
    setsParaGanar: previo?.setsParaGanar ?? 3,
    invertido: false,
    ganador: null,
  };
}

export function numeroDeSet(p: Partido): number {
  return p.sets.local + p.sets.visita + 1;
}

export function esDecisivo(p: Partido): boolean {
  const limite = p.setsParaGanar - 1;
  return p.sets.local === limite && p.sets.visita === limite;
}

export function puntosParaSet(p: Partido): number {
  return esDecisivo(p) ? PUNTOS_DECISIVO : PUNTOS_SET;
}

function ganaSet(propios: number, ajenos: number, objetivo: number): boolean {
  return propios >= objetivo && propios - ajenos >= 2;
}

/**
 * Si el equipo gana el set con el próximo punto. Sirve para el cartel de
 * "set point" / "match point".
 */
export function tienePuntoDeSet(p: Partido, e: Equipo): boolean {
  if (p.ganador) return false;
  return ganaSet(p.puntos[e] + 1, p.puntos[otro(e)], puntosParaSet(p));
}

export function tienePuntoDePartido(p: Partido, e: Equipo): boolean {
  return tienePuntoDeSet(p, e) && p.sets[e] + 1 === p.setsParaGanar;
}

export function anotar(
  p: Partido,
  equipo: Equipo,
  jugada: Jugada,
): { partido: Partido; resultado: Resultado } | null {
  if (p.ganador) return null;

  const puntos = { ...p.puntos, [equipo]: p.puntos[equipo] + 1 };

  if (!ganaSet(puntos[equipo], puntos[otro(equipo)], puntosParaSet(p))) {
    return {
      partido: { ...p, puntos, saque: equipo },
      resultado: { tipo: "jugada", jugada, equipo },
    };
  }

  const set: SetJugado = { local: puntos.local, visita: puntos.visita };
  const sets = { ...p.sets, [equipo]: p.sets[equipo] + 1 };
  const ganador = sets[equipo] === p.setsParaGanar ? equipo : null;

  return {
    partido: {
      ...p,
      // Si terminó el partido el marcador queda congelado en el último set,
      // que es lo que la gente quiere ver en la tele.
      puntos: ganador ? puntos : { local: 0, visita: 0 },
      sets,
      jugados: [...p.jugados, set],
      saque: equipo,
      ganador,
    },
    resultado: { tipo: ganador ? "partido" : "set", jugada, equipo, set },
  };
}
