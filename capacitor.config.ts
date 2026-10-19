import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Apps Android del club. Son cuatro, armadas con el mismo proyecto nativo:
 *
 * - **Matter** (`npm run apk`): el panel de los dueños, abre /admin.
 * - **Matter Tablero** (`npm run apk:tablero`): el control del tablero de vóley
 *   en el celu, abre /tablero. Se elige con APP=tablero, y del lado nativo con
 *   `-Ptablero` (ver android/app/build.gradle).
 * - **Matter Torneo** (`npm run apk:torneo`): la carga del torneo, abre
 *   /torneo. Se elige con APP=torneo y `-Ptorneo`.
 * - **Matter Tele** (`npm run apk:tele`): la pantalla sola de la tele, abre
 *   /tablero/tele. Pensada para instalarse en un Android TV / Google TV / Fire
 *   TV Stick: se prende la tele y ya está mostrando el marcador, sin tipear
 *   ninguna URL cada vez. Se elige con APP=tele y `-Ptele`.
 *
 * Se pueden tener instaladas todas a la vez: tienen distinto appId.
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
const APPS = {
  panel: { appId: "com.matterclub.panel", appName: "Matter", ruta: "/admin" },
  tablero: { appId: "com.matterclub.tablero", appName: "Matter Tablero", ruta: "/tablero" },
  torneo: { appId: "com.matterclub.torneo", appName: "Matter Torneo", ruta: "/torneo" },
  tele: { appId: "com.matterclub.tele", appName: "Matter Tele", ruta: "/tablero/tele" },
};
const app = APPS[process.env.APP as keyof typeof APPS] ?? APPS.panel;

const config: CapacitorConfig = {
  // Ojo: `cap sync` no reescribe ni el id ni el nombre una vez creado el
  // proyecto nativo. Los que valen son los de android/app/build.gradle; si se
  // cambian acá, hay que cambiarlos también allá.
  appId: app.appId,
  appName: app.appName,
  // Con `server.url` el contenido sale de internet, pero Capacitor igual exige
  // que esta carpeta exista. Se genera con `npm run build:estatico`.
  webDir: "out",
  server: {
    // Va SIN barra final a propósito. El sitio se exporta con trailingSlash,
    // pero Netlify redirige /admin/ a /admin con un 308: apuntar a la versión
    // con barra hace que la app pague ese salto cada vez que arranca.
    url: `https://matterclub.netlify.app${app.ruta}`,
    // Sin texto plano: el sitio es HTTPS y no hay motivo para permitir HTTP.
    cleartext: false,
  },
  android: {
    // Evita el flash blanco antes de que cargue la página.
    backgroundColor: "#090c12",
  },
  plugins: {
    // El tablero, el torneo y la tele se usan a pantalla completa, sin barra
    // de estado ni de navegación de Android (el panel, no: ahí no molesta y
    // se usa como una app cualquiera). El botón "pantalla completa" de la web
    // sólo agranda el contenido adentro del WebView: nunca tocaba estas
    // barras, por eso en la app nunca se veía completo por más que se
    // tocara.
    SystemBars: { hidden: app.appId !== APPS.panel.appId },
  },
};

export default config;
