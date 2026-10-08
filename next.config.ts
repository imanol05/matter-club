import type { NextConfig } from "next";

/**
 * El sitio es 100% estático: se exporta a HTML plano y puede vivir en cualquier
 * hosting que sirva archivos.
 *
 * `ESTATICO=1` es lo único que hace falta, y genera la carpeta out/. Queda como
 * variable y no fijo porque `next dev` no convive con `output: "export"`.
 *
 *   npm run dev            → desarrollo
 *   npm run build:estatico → lo que se publica
 *
 * Hubo un tiempo en que esto también manejaba un `basePath`, porque el sitio
 * colgaba del subdirectorio /matter-club en GitHub Pages. Ahora vive en la raíz
 * de Netlify y no hace falta; si algún día vuelve a un subdirectorio, está en
 * la historia de git.
 */
const nextConfig: NextConfig =
  process.env.ESTATICO === "1"
    ? {
        output: "export",
        // Genera turnos/index.html en vez de turnos.html: los hostings
        // estáticos no resuelven la ruta /turnos contra un archivo suelto.
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {};

export default nextConfig;
