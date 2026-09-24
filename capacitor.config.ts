import type { CapacitorConfig } from "@capacitor/cli";

/**
 * App Android para los dueños del club.
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
const config: CapacitorConfig = {
  appId: "com.matterclub.panel",
  // Ojo: `cap sync` no reescribe el nombre una vez creado el proyecto nativo.
  // Si se cambia acá, hay que tocar también android/app/src/main/res/values/strings.xml.
  appName: "Matter",
  // Con `server.url` el contenido sale de internet, pero Capacitor igual exige
  // que esta carpeta exista. Se genera con `npm run build:pages`.
  webDir: "out",
  server: {
    url: "https://imanol05.github.io/matter-club/admin/",
    // Sin texto plano: el sitio es HTTPS y no hay motivo para permitir HTTP.
    cleartext: false,
  },
  android: {
    // Evita el flash blanco antes de que cargue la página.
    backgroundColor: "#090c12",
  },
};

export default config;
