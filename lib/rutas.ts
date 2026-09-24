/**
 * Prefijo del sitio dentro del dominio.
 *
 * Vale "" cuando el sitio vive en la raíz (Netlify, dominio propio, desarrollo)
 * y "/matter-club" en GitHub Pages, que lo sirve desde un subdirectorio.
 *
 * Next ya se encarga de los enlaces y los `import` de imágenes. Esto hace falta
 * sólo donde armamos rutas a mano —el manifiesto y el ícono de iOS— porque ahí
 * Next no tiene forma de saber que son URLs.
 */
export const BASE = process.env.BASE_PATH ?? "";
