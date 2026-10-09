import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Apps Android del club. Son dos, armadas con el mismo proyecto nativo:
 *
 * - **Matter** (`npm run apk`): el panel de los dueños, abre /admin.
 * - **Matter Tablero** (`npm run apk:tablero`): el control del tablero de vóley
 *   en el celu, abre /tablero. Se elige con APP=tablero, y del lado nativo con
 *   `-Ptablero` (ver android/app/build.gradle).
 *
 * Las dos se pueden tener instaladas a la vez: tienen distinto appId.
 *
 * Detalles de la del panel:
 *
 * Es una cáscara que abre el sitio publicado directo en el panel. No lleva el
 * sitio adentro a propósito: así, cuando se actualiza algo, a los dueños les
 * llega solo y no hay que mandarles un APK nuevo cada vez.
 *
 * La contra es que necesita internet para funcionar. Para un panel que
 * justamente sirve para mirar reservas que están en un servidor, no es una
 * pérdida real.
 *
 * Los clientes no usan esto: para ellos es la página web y listo.
 */
const tablero = process.env.APP === "tablero";

const config: CapacitorConfig = {
  // Ojo: `cap sync` no reescribe ni el id ni el nombre una vez creado el
  // proyecto nativo. Los que valen son los de android/app/build.gradle; si se
  // cambian acá, hay que cambiarlos también allá.
  appId: tablero ? "com.matterclub.tablero" : "com.matterclub.panel",
  appName: tablero ? "Matter Tablero" : "Matter",
  // Con `server.url` el contenido sale de internet, pero Capacitor igual exige
  // que esta carpeta exista. Se genera con `npm run build:estatico`.
  webDir: "out",
  server: {
    // Va SIN barra final a propósito. El sitio se exporta con trailingSlash,
    // pero Netlify redirige /admin/ a /admin con un 308: apuntar a la versión
    // con barra hace que la app pague ese salto cada vez que arranca.
    url: tablero ? "https://matterclub.netlify.app/tablero" : "https://matterclub.netlify.app/admin",
    // Sin texto plano: el sitio es HTTPS y no hay motivo para permitir HTTP.
    cleartext: false,
  },
  android: {
    // Evita el flash blanco antes de que cargue la página.
    backgroundColor: "#090c12",
  },
};

export default config;
