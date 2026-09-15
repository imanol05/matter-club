/**
 * Datos de demostración.
 *
 * Una grilla vacía no muestra nada: la gracia del turnero se entiende cuando se
 * ve una semana real, con los fijos de siempre ocupando la franja de la noche y
 * un par de huecos sueltos. Todo esto se genera relativo a la semana actual, así
 * que la demo se ve igual de viva se abra el día que se abra.
 *
 * Cuando enchufemos Supabase, este archivo desaparece.
 */

import { CANCHA_ID, type Reserva } from "./tipos";
import {
  SEMANAS_A_FUTURO,
  bloques,
  inicioISO,
  jornadasDeLaSemana,
  lunesDeLaSemana,
  sumarDias,
  yaPaso,
} from "./horarios";

/** Turnos fijos semanales. `dia` es 0 = lunes. */
const FIJOS = [
  { dia: 0, bloque: 6, nombre: "Los Pumas VC", telefono: "351 554 1228" },
  { dia: 1, bloque: 6, nombre: "Grupo de Juanma", telefono: "351 670 2913" },
  { dia: 1, bloque: 7, nombre: "Escuela Matter · Sub 16", telefono: "351 339 8551" },
  { dia: 2, bloque: 5, nombre: "Recreativo Nueva Córdoba", telefono: "351 224 5778" },
  { dia: 3, bloque: 6, nombre: "Las Panteras", telefono: "351 441 8609" },
  { dia: 4, bloque: 7, nombre: "After office Vóley", telefono: "351 506 3332" },
];

/** Reservas sueltas: se siembran con probabilidad según el día y la hora. */
const CASUALES = [
  "Martín Sosa",
  "Caro Gutiérrez",
  "Nico Ferreyra",
  "Equipo Delta",
  "Flor Ramírez",
  "Los del Barrio",
  "Seba Aguirre",
  "Vóley Amigos",
  "Pao Medina",
  "Grupo del jueves",
];

const TELEFONOS = [
  "351 621 8447", "351 337 2991", "351 558 9024", "351 290 4773",
  "351 412 7665", "351 774 5118", "351 306 1882", "351 583 0229",
  "351 669 4551", "351 241 3770",
];

/** Hash estable: misma celda → mismo resultado siempre, sin depender del reloj. */
function ruido(semilla: string): number {
  let h = 2166136261;
  for (let i = 0; i < semilla.length; i++) {
    h ^= semilla.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * Qué tan pedido es cada bloque: la noche se llena, el mediodía no.
 * Un valor por bloque, de 08:00 a 22:00.
 */
const DEMANDA = [0.1, 0.12, 0.08, 0.15, 0.3, 0.45, 0.7, 0.55];

function reserva(
  jornada: string,
  bloque: number,
  datos: Partial<Reserva> & Pick<Reserva, "nombre" | "telefono">,
): Reserva {
  return {
    id: `seed:${jornada}#${bloque}`,
    canchaId: CANCHA_ID,
    jornada,
    bloque,
    inicio: inicioISO(jornada, bloque),
    estado: "confirmada",
    creada: new Date().toISOString(),
    ...datos,
  };
}

export function generarSemilla(hoy = new Date()): Reserva[] {
  const primerLunes = sumarDias(lunesDeLaSemana(hoy), -7);
  const salida: Reserva[] = [];
  const ocupado = new Set<string>();

  // La semana pasada, la actual y todas las que se puedan reservar: si el seed
  // se quedara corto, los turnos fijos desaparecerían de golpe a mitad del
  // calendario y se notaría.
  const semanas = SEMANAS_A_FUTURO + 2;
  for (let semana = 0; semana < semanas; semana++) {
    const lunes = sumarDias(primerLunes, semana * 7);
    const jornadas = jornadasDeLaSemana(lunes);

    for (const fijo of FIJOS) {
      const jornada = jornadas[fijo.dia];
      const clave = `${jornada}#${fijo.bloque}`;
      ocupado.add(clave);
      salida.push(
        reserva(jornada, fijo.bloque, {
          nombre: fijo.nombre,
          telefono: fijo.telefono,
          fijo: true,
          nota: "Turno fijo semanal",
        }),
      );
    }

    jornadas.forEach((jornada, diaIdx) => {
      const finde = diaIdx >= 5;
      for (const bloque of bloques) {
        const clave = `${jornada}#${bloque}`;
        if (ocupado.has(clave)) continue;

        const r = ruido(clave);
        const umbral = DEMANDA[bloque] * (finde ? 1.5 : 1);
        if (r > umbral) continue;

        ocupado.add(clave);
        const i = Math.floor(ruido(clave + "n") * CASUALES.length);
        salida.push(
          reserva(jornada, bloque, {
            nombre: CASUALES[i],
            telefono: TELEFONOS[i],
          }),
        );
      }
    });
  }

  /** Libera una celda por si el relleno casual ya la había tomado. */
  const desocupar = (jornada: string, bloque: number) => {
    const i = salida.findIndex((r) => r.jornada === jornada && r.bloque === bloque);
    if (i !== -1) salida.splice(i, 1);
    ocupado.add(`${jornada}#${bloque}`);
  };

  // Solicitudes esperando respuesta del encargado, esta semana. Son lo primero
  // que se ve en el panel, así que pisan al relleno si hace falta.
  const estaSemana = jornadasDeLaSemana(lunesDeLaSemana(hoy));
  const pendientes: Array<[number, number, string, string, string]> = [
    [5, 4, "Ale Quiroga", "11 5512 6604", "Somos 12, ¿alcanza con una cancha?"],
    [6, 5, "Vicky Paz", "11 6829 3341", "Cumpleaños, llevamos torta"],
    [3, 7, "Tomi Bianchi", "351 227 6559", ""],
  ];
  for (const [dia, bloque, nombre, telefono, nota] of pendientes) {
    // Si ese horario ya pasó (depende del día en que se abra la demo), la
    // solicitud se corre a la semana siguiente: un pedido pendiente para ayer
    // no tiene sentido.
    let jornada = estaSemana[dia];
    if (yaPaso(jornada, bloque, hoy)) jornada = sumarDias(jornada, 7);
    desocupar(jornada, bloque);
    salida.push(
      reserva(jornada, bloque, { nombre, telefono, nota, estado: "pendiente" }),
    );
  }

  // Mantenimiento del piso: el miércoles que viene a la mañana.
  const proxima = jornadasDeLaSemana(sumarDias(lunesDeLaSemana(hoy), 7));
  for (const bloque of [0, 1]) {
    const jornada = proxima[2];
    desocupar(jornada, bloque);
    salida.push(
      reserva(jornada, bloque, {
        nombre: "Mantenimiento",
        telefono: "",
        estado: "bloqueo",
        nota: "Pulido del piso",
      }),
    );
  }

  return salida;
}
