import type { NextConfig } from "next";

/**
 * El sitio es 100% estático, así que se exporta a HTML plano y puede vivir en
 * cualquier hosting que sirva archivos.
 *
 * Son dos variables separadas a propósito, porque no siempre van juntas:
 *
 * - `ESTATICO=1` genera la carpeta out/.
 * - `BASE_PATH` sólo hace falta cuando el sitio cuelga de un subdirectorio,
 *   como en GitHub Pages (/matter-club). En Netlify o con dominio propio va en
 *   la raíz y tiene que quedar vacío, o todos los enlaces apuntarían a una
 *   carpeta que no existe.
 *
 *   npm run dev            → desarrollo, en la raíz
 *   npm run build:pages    → para GitHub Pages, con el prefijo
 *   npm run build:estatico → para Netlify o dominio propio, sin prefijo
 */
export const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig =
  process.env.ESTATICO === "1"
    ? {
        output: "export",
        basePath,
        // Genera turnos/index.html en vez de turnos.html: los hostings
        // estáticos no resuelven la ruta /turnos contra un archivo suelto.
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {};

export default nextConfig;
