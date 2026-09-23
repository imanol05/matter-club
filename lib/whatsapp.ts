/**
 * Armado de links de WhatsApp.
 *
 * No hace falta ninguna API ni cuenta de empresa: wa.me abre el chat con el
 * mensaje ya escrito y el encargado sólo aprieta enviar. Cuando el volumen lo
 * justifique se puede pasar a la API oficial y mandarlo solo, pero para una
 * cancha esto alcanza y no cuesta nada.
 */

import { etiquetaJornada, rangoBloque } from "./horarios";
import { CONTACTO } from "./club";

/**
 * Pasa un teléfono argentino escrito como sea al formato que espera wa.me.
 *
 * Los celulares argentinos necesitan el 9 después del 54 para mensajería, que
 * es el error clásico: sin ese 9 el link abre un chat vacío con un número que
 * no existe.
 */
export function normalizarTelefono(telefono: string): string | null {
  let digitos = telefono.replace(/\D/g, "");
  if (!digitos) return null;

  // Sacamos el 0 de larga distancia y el 15 de celular si vinieran escritos.
  if (digitos.startsWith("0")) digitos = digitos.slice(1);
  if (digitos.length === 10 && digitos.startsWith("15")) digitos = digitos.slice(2);

  if (digitos.startsWith("549")) return digitos;
  if (digitos.startsWith("54")) return `549${digitos.slice(2)}`;
  if (digitos.length === 10) return `549${digitos}`;
  return digitos.length >= 8 ? `549${digitos}` : null;
}

function link(telefono: string, mensaje: string): string | null {
  const numero = normalizarTelefono(telefono);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Consulta de disponibilidad, del cliente hacia el club.
 *
 * Es lo que reemplaza a la reserva mientras no haya base de datos: no podemos
 * decirle a nadie si un horario está libre, pero sí dejarle el mensaje armado
 * con el día y la hora exactos para que pregunte.
 */
export function consultaDeTurno(jornada: string, bloque: number): string {
  return (
    link(
      CONTACTO.telefono,
      `¡Hola! Quería consultar por la cancha el ` +
        `${etiquetaJornada(jornada).toLowerCase()} de ${rangoBloque(bloque)}. ` +
        `¿Está disponible?`,
    ) ?? CONTACTO.whatsappUrl
  );
}

export function avisoDeConfirmacion(
  nombre: string,
  jornada: string,
  bloque: number,
  telefono: string,
): string | null {
  const primerNombre = nombre.trim().split(/\s+/)[0];
  return link(
    telefono,
    `¡Hola ${primerNombre}! Te confirmamos la cancha en ${CONTACTO.nombre} ` +
      `para el ${etiquetaJornada(jornada).toLowerCase()} de ${rangoBloque(bloque)}. ` +
      `Te esperamos 🏐`,
  );
}

export function avisoDeRechazo(
  nombre: string,
  jornada: string,
  bloque: number,
  telefono: string,
): string | null {
  const primerNombre = nombre.trim().split(/\s+/)[0];
  return link(
    telefono,
    `¡Hola ${primerNombre}! Te escribimos de ${CONTACTO.nombre}. ` +
      `No vamos a poder darte la cancha el ${etiquetaJornada(jornada).toLowerCase()} ` +
      `de ${rangoBloque(bloque)}. Escribinos y buscamos otro horario.`,
  );
}

export function avisoDeHorarioLibre(
  nombre: string,
  jornada: string,
  bloque: number,
  telefono: string,
): string | null {
  const primerNombre = nombre.trim().split(/\s+/)[0];
  return link(
    telefono,
    `¡Hola ${primerNombre}! Se liberó el horario que estabas esperando en ` +
      `${CONTACTO.nombre}: ${etiquetaJornada(jornada).toLowerCase()} de ` +
      `${rangoBloque(bloque)}. ¿Lo querés?`,
  );
}
