/**
 * `canchaId` hoy vale siempre "matter-1". Está de entrada para que sumar una
 * segunda cancha (o una segunda cancha cliente) sea agregar filas, no rehacer
 * el modelo.
 */
export const CANCHA_ID = "matter-1";

export type EstadoReserva = "pendiente" | "confirmada" | "rechazada" | "bloqueo";

/** Una reserva ocupa exactamente un bloque de la grilla, un día concreto. */
export type Reserva = {
  id: string;
  canchaId: string;
  /** Día de cancha al que pertenece el turno (ver lib/horarios.ts). */
  jornada: string;
  /** Índice del bloque dentro de la jornada. */
  bloque: number;
  /** Instante real de inicio, ISO con offset. Redundante con jornada+bloque,
   *  pero es lo que va a viajar a la base cuando enchufemos Supabase. */
  inicio: string;
  estado: EstadoReserva;
  nombre: string;
  telefono: string;
  nota?: string;
  creada: string;
};

/**
 * Turno fijo semanal: "los martes a las 20, todas las semanas".
 *
 * No se guarda una reserva por semana sino la regla, y la grilla la expande al
 * dibujarse. Si se guardaran expandidas habría que decidir hasta cuándo
 * generarlas, y dar de baja el turno obligaría a salir a borrar decenas de
 * filas sueltas.
 */
export type TurnoFijo = {
  id: string;
  canchaId: string;
  /** 0 = lunes … 6 = domingo. */
  diaSemana: number;
  bloque: number;
  nombre: string;
  telefono: string;
  /** Primera jornada en que rige, inclusive. */
  desde: string;
  /** Última jornada en que rige, inclusive. null = sigue vigente. */
  hasta: string | null;
  creado: string;
};

/** Alguien anotado para que le avisen si un horario ocupado se libera. */
export type Espera = {
  id: string;
  canchaId: string;
  jornada: string;
  bloque: number;
  nombre: string;
  telefono: string;
  creada: string;
};

/** Quién tiene tomado un bloque de la grilla, y por qué. */
export type Ocupacion =
  | { tipo: "reserva"; reserva: Reserva }
  | { tipo: "fijo"; fijo: TurnoFijo };

export type NuevaSolicitud = {
  jornada: string;
  bloque: number;
  nombre: string;
  telefono: string;
  nota?: string;
};

export type NuevoFijo = {
  diaSemana: number;
  bloque: number;
  nombre: string;
  telefono: string;
  desde: string;
};
