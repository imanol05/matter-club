import type { MetadataRoute } from "next";

/**
 * Manifiesto de la PWA: lo que hace que el navegador ofrezca "agregar a
 * pantalla de inicio" y que la app abra sin la barra de direcciones.
 *
 * Las rutas llevan el prefijo del subdirectorio de GitHub Pages porque el
 * sitio no vive en la raíz del dominio. Sin eso, el celular busca los íconos
 * en imanol05.github.io/icono-512.png y no los encuentra.
 */
import { BASE as base } from "@/lib/rutas";

// El manifiesto es un Route Handler, y la exportación estática necesita que se
// diga explícitamente que no depende del pedido. Sin esto el build estático
// falla, aunque `npm run build` pase sin chistar.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Matter · Cancha de vóley",
    short_name: "Matter",
    description:
      "Turnos de la cancha de vóley Matter, en Córdoba. Mirá los horarios libres y pedí el tuyo.",
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#090c12",
    theme_color: "#090c12",
    lang: "es-AR",
    icons: [
      {
        src: `${base}/icono-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${base}/icono-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // Android recorta el ícono a círculo o squircle según el teléfono: este
        // trae el logo más chico y con fondo, para que no le corte el trazo.
        src: `${base}/icono-maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
