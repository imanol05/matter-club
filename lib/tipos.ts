/**
 * Una reserva ocupa exactamente un bloque de la grilla.
 *
 * `canchaId` hoy vale siempre "matter-1". Está de entrada para que sumar una
 * segunda cancha (o una segunda cancha cliente) sea agregar filas, no rehacer
 * el modelo.
 */
export type EstadoReserva = "pendiente" | "confirmada" | "rechazada" | "bloqueo";

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
  /** Turno fijo semanal: se repite todas las semanas hasta que lo den de baja. */
  fijo?: boolean;
  creada: string;
};

export type NuevaSolicitud = {
  jornada: string;
  bloque: number;
  nombre: string;
  telefono: string;
  nota?: string;
};

export const CANCHA_ID = "matter-1";
