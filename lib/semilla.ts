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

import {
  CANCHA_ID,
  type Espera,
  type Reserva,
  type TurnoFijo,
} from "./tipos";
import type { Datos } from "./almacen";
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

export function generarSemilla(hoy = new Date()): Datos {
  const lunesActual = lunesDeLaSemana(hoy);
  const primerLunes = sumarDias(lunesActual, -7);
  const reservas: Reserva[] = [];
  const ocupado = new Set<string>();

  // Los fijos se guardan como regla, no expandidos: la grilla los dibuja sola.
  // Arrancan un mes atrás para que también se vean en las semanas pasadas.
  const fijos: TurnoFijo[] = FIJOS.map((f, i) => ({
    id: `seed-fijo-${i}`,
    canchaId: CANCHA_ID,
    diaSemana: f.dia,
    bloque: f.bloque,
    nombre: f.nombre,
    telefono: f.telefono,
    desde: sumarDias(lunesActual, -28),
    hasta: null,
    creado: new Date().toISOString(),
  }));
  const huecosFijos = new Set(FIJOS.map((f) => `${f.dia}#${f.bloque}`));

  // La semana pasada, la actual y todas las que se puedan reservar.
  for (let semana = 0; semana < SEMANAS_A_FUTURO + 2; semana++) {
    const jornadas = jornadasDeLaSemana(sumarDias(primerLunes, semana * 7));

    jornadas.forEach((jornada, diaIdx) => {
      const finde = diaIdx >= 5;
      for (const bloque of bloques) {
        // No pisamos los horarios que ya tienen un fijo encima.
        if (huecosFijos.has(`${diaIdx}#${bloque}`)) continue;

        const clave = `${jornada}#${bloque}`;
        const r = ruido(clave);
        if (r > DEMANDA[bloque] * (finde ? 1.5 : 1)) continue;

        ocupado.add(clave);
        const i = Math.floor(ruido(clave + "n") * CASUALES.length);
        reservas.push(
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
    const i = reservas.findIndex(
      (r) => r.jornada === jornada && r.bloque === bloque,
    );
    if (i !== -1) reservas.splice(i, 1);
    ocupado.add(`${jornada}#${bloque}`);
  };

  // Solicitudes esperando respuesta del encargado. Son lo primero que se ve en
  // el panel, así que pisan al relleno si hace falta.
  const estaSemana = jornadasDeLaSemana(lunesActual);
  const pendientes: Array<[number, number, string, string, string]> = [
    [5, 4, "Ale Quiroga", "351 551 2660", "Somos 12, ¿alcanza con una cancha?"],
    [6, 5, "Vicky Paz", "351 682 9334", "Cumpleaños, llevamos torta"],
    [3, 7, "Tomi Bianchi", "351 227 6559", ""],
  ];
  for (const [dia, bloque, nombre, telefono, nota] of pendientes) {
    // Si ese horario ya pasó (depende del día en que se abra la demo), la
    // solicitud se corre a la semana siguiente: un pedido pendiente para ayer
    // no tiene sentido.
    let jornada = estaSemana[dia];
    if (yaPaso(jornada, bloque, hoy)) jornada = sumarDias(jornada, 7);
    desocupar(jornada, bloque);
    reservas.push(
      reserva(jornada, bloque, { nombre, telefono, nota, estado: "pendiente" }),
    );
  }

  // Mantenimiento del piso: el miércoles que viene a la mañana.
  const proxima = jornadasDeLaSemana(sumarDias(lunesActual, 7));
  for (const bloque of [0, 1]) {
    desocupar(proxima[2], bloque);
    reservas.push(
      reserva(proxima[2], bloque, {
        nombre: "Mantenimiento",
        telefono: "",
        estado: "bloqueo",
        nota: "Pulido del piso",
      }),
    );
  }

  // Dos anotados esperando que se libere la franja de la noche, que es la que
  // siempre está llena.
  const esperas: Espera[] = [
    {
      id: "seed-espera-0",
      canchaId: CANCHA_ID,
      jornada: proxima[1],
      bloque: 6,
      nombre: "Lucho Peralta",
      telefono: "351 448 2107",
      creada: new Date().toISOString(),
    },
    {
      id: "seed-espera-1",
      canchaId: CANCHA_ID,
      jornada: proxima[4],
      bloque: 7,
      nombre: "Sofi Andrada",
      telefono: "351 390 6628",
      creada: new Date().toISOString(),
    },
  ];

  return { reservas, fijos, esperas };
}
