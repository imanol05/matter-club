/**
 * Datos del club, todos juntos en un solo lugar.
 *
 * Lo que está marcado con A CONFIRMAR todavía no lo validó nadie de Matter.
 */

export const CONTACTO = {
  nombre: "Matter",
  ciudad: "Córdoba",
  direccion: "Av. Bulnes 1756, Córdoba",
  telefono: "351 318 4824",
  whatsappUrl: "https://wa.me/5493513184824",
  instagram: "@matterclub.gp",
  instagramUrl: "https://www.instagram.com/matterclub.gp/",
  horario: "08:00 a 00:00",
  mapaUrl:
    "https://www.google.com/maps/search/?api=1&query=Av.+Bulnes+1756,+C%C3%B3rdoba",
};

/**
 * Ningún precio está confirmado por el club, así que todos dicen "Consultar".
 * Publicar una tarifa que después no es la que cobran es peor que no publicar
 * ninguna: la gente llega con un número en la cabeza y se arma un lío en el
 * mostrador. Cuando los dueños definan, se cambian acá.
 */
type Tarifa = {
  titulo: string;
  precio: string;
  unidad: string;
  detalle: string;
  destacado: boolean;
  /** Chip que va arriba de la tarjeta. */
  etiqueta?: string;
};

export const TARIFAS: Tarifa[] = [
  {
    titulo: "Turno de 2 horas",
    precio: "Consultar",
    unidad: "por WhatsApp, al toque",
    detalle: "Escribinos y te pasamos el valor y la disponibilidad del día.",
    destacado: true,
  },
  {
    titulo: "Turno fijo semanal",
    precio: "Consultar",
    unidad: "mismo día y horario, todas las semanas",
    detalle:
      "Tenés la cancha guardada sin pedirla de nuevo. Escribinos y lo arreglamos.",
    destacado: false,
  },
  {
    titulo: "Evento o torneo",
    precio: "Consultar",
    unidad: "a convenir",
    detalle: "Cumpleaños, torneos internos, jornadas de empresa.",
    destacado: false,
  },
];

export const MEDIOS_DE_PAGO = "Efectivo o transferencia, en la cancha.";

/** `proximamente` marca lo que todavía no está pero ya está en camino. */
export const CARACTERISTICAS = [
  {
    titulo: "Cancha techada",
    texto: "Llueva o haga calor, el turno se juega igual. No se suspende nada.",
    icono: "techo",
    proximamente: false,
  },
  {
    titulo: "Piso flotante",
    texto:
      "Superficie deportiva con amortiguación, pensada para el salto y la caída.",
    icono: "piso",
    proximamente: false,
  },
  {
    titulo: "Baños por sexo",
    texto: "Baños separados para hombres y mujeres.",
    icono: "bano",
    proximamente: false,
  },
  {
    titulo: "Kiosco, Buffet",
    texto: "Para el después del partido: bebidas y algo para picar.",
    icono: "kiosco",
    proximamente: true,
  },
];
