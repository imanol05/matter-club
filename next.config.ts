import type { NextConfig } from "next";

/**
 * El sitio es 100% estático, así que para GitHub Pages se exporta a HTML plano.
 *
 * Va detrás de una variable de entorno y no siempre activo porque Pages sirve
 * desde un subdirectorio (/matter-club), y ese prefijo rompería el `npm run dev`
 * local: habría que entrar a localhost:3000/matter-club en vez de la raíz.
 *
 *   npm run dev           → desarrollo normal, en la raíz
 *   npm run build:pages   → carpeta out/ lista para publicar
 */
const paraPages = process.env.PAGES === "1";

const nextConfig: NextConfig = paraPages
  ? {
      output: "export",
      basePath: "/matter-club",
      // Genera turnos/index.html en vez de turnos.html: Pages no resuelve
      // la ruta /turnos contra un archivo suelto.
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
