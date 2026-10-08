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
 * El turno de 2 horas sale $5.555 por persona (confirmado por el club el
 * 2026-10-08). Los otros dos siguen a convenir.
 *
 * El precio va a subir con el tiempo, así que se cambia acá y en ningún otro
 * lado: la cifra no está escrita en el texto de las páginas justamente para
 * que actualizarla sea cambiar una línea.
 *
 * Al lado del valor va la fecha desde cuándo rige. No es un detalle de diseño:
 * si el cliente llega con un número viejo en la cabeza, la discusión en el
 * mostrador la gana el que puede mostrar desde cuándo cambió.
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
    precio: "$5.555",
    unidad: "por persona",
    detalle:
      "Reservás la cancha completa y dividen entre los que juegan. Sin costo de cancha aparte.",
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

/**
 * Desde cuándo rige el precio de arriba. Se actualiza SIEMPRE junto con la
 * cifra: una tarifa sin fecha no sirve para zanjar un reclamo.
 */
export const PRECIOS_VIGENTES_DESDE = "octubre de 2026";

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
