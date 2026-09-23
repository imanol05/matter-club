/**
 * Lógica de horarios del turnero.
 *
 * Dos cosas importantes que definen todo lo demás:
 *
 * 1. La grilla se arma por "jornada", no por día calendario: la jornada es la
 *    fecha en que ese día de cancha arrancó. Hoy Matter cierra a las 00:00 y
 *    entonces las dos cosas coinciden, pero si alguna vez estiran el horario
 *    pasada la medianoche, el turno de las 00:00 del sábado tiene que seguir
 *    apareciendo en la columna del viernes: para el encargado y para el que
 *    juega, eso es "la noche del viernes". La distinción está sostenida en
 *    `inicioISO()` y no cuesta nada mantenerla.
 *
 * 2. Argentina está en UTC-3 fijo, sin horario de verano desde 2009, así que
 *    podemos fijar el offset en vez de arrastrar una librería de zonas horarias.
 *    Si algún día eso cambia, este es el único archivo que hay que tocar.
 */

export const ZONA = "America/Argentina/Buenos_Aires";
export const OFFSET = "-03:00";

/** Primera hora de juego del día. */
export const HORA_APERTURA = 8;
/** Duración de cada turno, en horas. */
export const DURACION_HS = 2;
/** Cantidad de turnos por jornada: 08:00 → 00:00. */
export const BLOQUES_POR_JORNADA = 8;
/** Con cuánta anticipación se puede reservar. */
export const SEMANAS_A_FUTURO = 12;

export const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DIAS_LARGOS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
export const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Fecha → "YYYY-MM-DD" en hora local (no usar toISOString: eso pasa a UTC). */
export function claveFecha(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** "YYYY-MM-DD" → Date a medianoche local. */
export function desdeClave(clave: string): Date {
  const [a, m, d] = clave.split("-").map(Number);
  return new Date(a, m - 1, d);
}

export function sumarDias(clave: string, n: number): string {
  const d = desdeClave(clave);
  d.setDate(d.getDate() + n);
  return claveFecha(d);
}

/** Lunes de la semana a la que pertenece la fecha dada. */
export function lunesDeLaSemana(d: Date = new Date()): string {
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diaSemana = base.getDay(); // 0 = domingo
  const retroceso = diaSemana === 0 ? 6 : diaSemana - 1;
  base.setDate(base.getDate() - retroceso);
  return claveFecha(base);
}

/** Las 7 jornadas de la semana que arranca en `lunes`. */
export function jornadasDeLaSemana(lunes: string): string[] {
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

export const bloques = Array.from({ length: BLOQUES_POR_JORNADA }, (_, i) => i);

/** Hora de arranque del bloque, en formato 24hs (puede pasar de 23). */
function horaCruda(bloque: number): number {
  return HORA_APERTURA + bloque * DURACION_HS;
}

function formatoHora(hora24: number): string {
  return `${String(hora24 % 24).padStart(2, "0")}:00`;
}

/** "20:00" */
export function horaInicio(bloque: number): string {
  return formatoHora(horaCruda(bloque));
}

/** "22:00". La medianoche se muestra como "00:00". */
export function horaFin(bloque: number): string {
  return formatoHora(horaCruda(bloque) + DURACION_HS);
}

/** "20:00 – 22:00" */
export function rangoBloque(bloque: number): string {
  return `${horaInicio(bloque)} – ${horaFin(bloque)}`;
}

/** true si el turno arranca después de medianoche (o sea, ya es el día siguiente). */
export function esMadrugada(bloque: number): boolean {
  return horaCruda(bloque) >= 24;
}

/**
 * Momento exacto en que arranca el turno, como ISO con offset.
 * Acá es donde la jornada se traduce a un instante real: los bloques de
 * madrugada caen en la fecha siguiente a la de su jornada.
 */
export function inicioISO(jornada: string, bloque: number): string {
  const cruda = horaCruda(bloque);
  const fechaReal = cruda >= 24 ? sumarDias(jornada, 1) : jornada;
  return `${fechaReal}T${String(cruda % 24).padStart(2, "0")}:00:00${OFFSET}`;
}

export function inicioDate(jornada: string, bloque: number): Date {
  return new Date(inicioISO(jornada, bloque));
}

/** Identificador estable de una celda de la grilla. */
export function idSlot(jornada: string, bloque: number): string {
  return `${jornada}#${bloque}`;
}

export function yaPaso(jornada: string, bloque: number, ahora = new Date()): boolean {
  return inicioDate(jornada, bloque).getTime() <= ahora.getTime();
}

/** Día de la semana de una jornada, con 0 = lunes (no 0 = domingo como Date). */
export function diaSemana(jornada: string): number {
  return (desdeClave(jornada).getDay() + 6) % 7;
}

/** "Vie 12 de septiembre" */
export function etiquetaJornada(jornada: string): string {
  const d = desdeClave(jornada);
  return `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/** "12 sep – 18 sep" */
export function etiquetaSemana(lunes: string): string {
  const a = desdeClave(lunes);
  const b = desdeClave(sumarDias(lunes, 6));
  const mesA = MESES[a.getMonth()].slice(0, 3);
  const mesB = MESES[b.getMonth()].slice(0, 3);
  return `${a.getDate()} ${mesA} – ${b.getDate()} ${mesB}`;
}
