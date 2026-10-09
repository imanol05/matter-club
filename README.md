# Matter Club · turnero de la cancha

Web + turnero para reservar la cancha de vóley. Next.js 16 (App Router) +
Tailwind 4 + TypeScript.

```bash
npm run dev            # http://localhost:3000
npm run build:estatico # lo que se publica (genera out/)
npx eslint .           # lint
npm run apk            # genera matter-panel.apk para los dueños
```

Publicado en <https://matterclub.netlify.app/>

**Se publica con `git push` y nada más**: Netlify compila solo con cada push a
`main`. No hay script de deploy ni paso manual. Hubo un tiempo en que el sitio
también vivía en GitHub Pages y se subía con un `deploy.sh`, pero tener dos
sitios que se actualizaban distinto terminó en lo esperable —uno quedó viejo—
así que quedó sólo Netlify.

## Pantallas

| Ruta      | Qué es                                                             |
| --------- | ------------------------------------------------------------------ |
| `/`       | Landing: presentación, características, tarifas, ubicación         |
| `/turnos` | Turnero con la ocupación real; el cliente pide y el dueño confirma |
| `/admin`  | Panel del encargado, detrás de login y con `noindex`               |
| `/tablero` | Marcador de vóley para mostrar en la tele, con `noindex`         |
| `/tablero/tele` | La pantalla de la tele, controlada desde `/tablero` en el celu |

`components/TurneroConsulta.tsx` quedó sin uso: era el selector que abría
WhatsApp cuando todavía no había base de datos y no se podía mostrar
disponibilidad real. Se conserva por si alguna vez hace falta un modo "sin
backend".

## El tablero para la tele

`/tablero` es un marcador de vóley pensado para abrir en el celu o la compu y
mandar a la tele duplicando pantalla. Tocar la tarjeta de un equipo le suma un
punto; **Ace** y **Monster block** también suman uno, pero con su animación.
Lleva sets (a 25, el decisivo a 15, con dos de diferencia), saque, set point y
match point, y festeja el set y el partido.

Se puede usar de dos maneras:

- **Duplicando pantalla**: se abre `/tablero` en el celu o la compu y se manda
  a la tele con Chromecast, Smart View, AirPlay o HDMI. En la tele se ve lo
  mismo que se toca, botones incluidos.
- **Celu de control y tele aparte**: en el navegador de la tele se abre
  `/tablero/tele`, que muestra un código de 4 letras. En el celu, en
  `/tablero`, se toca **Tele** y se escribe el código. Desde ahí la tele
  muestra sólo el marcador y los festejos, sin botones.

El partido vive en el navegador del celu (`localStorage`): si se recarga la
página el marcador sigue donde estaba. La tele no guarda nada: cuando se
conecta (o se recarga) le pide el partido al celu. Las reglas están en
`lib/tablero.ts`, puras, y deshacer es volver al estado anterior de una pila.

Celu y tele hablan por **Supabase Realtime en modo broadcast**
(`lib/enlace.ts`): un canal por código que reparte mensajes entre los
conectados y no guarda nada, así que no hizo falta ninguna tabla ni migración.
También va por `BroadcastChannel`, que une pestañas del mismo navegador sin
internet (una compu con la tele como segunda pantalla).

Cualquiera que sepa el código puede mandarle un marcador a esa tele. Para un
tablero de cancha alcanza; los mensajes se validan antes de dibujarse para que
uno mal formado no rompa la pantalla.

## Cómo funcionan los turnos fijos

Un turno fijo ("los martes a las 20, todas las semanas") se guarda como **una
regla**, no como una reserva por semana. La grilla lo expande al dibujarse.

Si se guardaran expandidos habría que decidir hasta qué fecha generarlos, y dar
de baja el turno obligaría a salir a borrar decenas de filas sueltas.

Dos reglas de resolución que importan:

- **Una reserva concreta le gana al fijo.** Si alguien ya tenía tomado ese día
  puntual antes de que existiera la regla, el que estaba primero manda.
- **Dar de baja marca `hasta`, no borra.** Las semanas pasadas tienen que seguir
  mostrando el turno porque ese grupo efectivamente jugó. Y vale hasta hoy
  inclusive: dar de baja los martes a la mañana no le saca la cancha al grupo
  esa misma noche.

## Los datos son reales

Backend en Supabase (proyecto `wabbodvqlzmuanrsuzfn`). Credenciales en
`.env.local`, que no va al repo — copiá `.env.local.example`. Las migraciones
están en `supabase/migraciones/` y se corren pegándolas en el SQL Editor.

Las pantallas sólo hablan con `lib/store.tsx`; toda la conversación con la base
pasa por `lib/almacen.ts`.

### Hay dos vistas del mismo dato

El **público** sólo puede leer las vistas `disponibilidad` y `fijos_publicos`,
que dicen qué rangos están tomados y nada más. No hay forma de que averigüe de
quién es cada turno, ni forzando la pantalla: se lo impiden las políticas RLS,
no el código del navegador. Por eso el tipo `Ocupacion` tiene el caso
`"ocupado"` a secas.

El **encargado** lee las tablas completas, con nombres y teléfonos. Para eso no
alcanza con tener sesión: hay que estar en la tabla `encargados`.

### Scripts de verificación

```bash
node verificar-backend.mjs     # esquema, permisos y el constraint
node verificar-privacidad.mjs  # que el público no pueda sacar datos personales
node verificar-registro.mjs    # que nadie pueda crearse cuenta solo
```

## Dos decisiones que conviene no romper

**La grilla se arma por jornada, no por día calendario.** Hoy Matter cierra a
las 00:00 y las dos cosas coinciden, pero si alguna vez estiran el horario
pasada la medianoche, el turno de las 00:00 del sábado tiene que seguir
apareciendo en la columna del viernes: para el encargado y para el que juega,
eso es "la noche del viernes". La distinción está sostenida en `lib/horarios.ts`
junto con el offset de Argentina (UTC-3 fijo, sin horario de verano), y no
cuesta nada mantenerla.

**El solapamiento de reservas se previene en la base, no en el código.**
`lib/almacen.ts` no chequea disponibilidad antes de insertar, y es a propósito:
entre preguntar y escribir, otro puede haber reservado. El que decide es el
constraint de exclusión de Postgres sobre el rango horario, que no tiene esa
ventana. Es lo único que aguanta dos personas tocando el mismo horario en el
mismo instante.

## La app de los dueños

`matter-panel.apk` es una cáscara de Capacitor que abre el sitio publicado
directo en `/admin`. **No lleva el sitio adentro**: así, cuando se publica una
actualización, a los dueños les llega sola y no hay que mandarles un APK nuevo.
La contra es que necesita internet, cosa que un panel de reservas necesita
igual.

Se genera con `npm run apk` y se instala de costado (hay que permitir
"orígenes desconocidos" una vez). Está firmado con la clave de depuración, que
alcanza para repartirlo a mano; si algún día va a la Play Store hay que armar
un keystore propio.

Los clientes no usan esto: para ellos es la página web y listo.

### La app del tablero

Con el mismo proyecto Android sale una segunda app, **Matter Tablero**, que
abre `/tablero` en vez de `/admin`: es el control del marcador de vóley en el
celu. Se genera con `npm run apk:tablero` y queda en `matter-tablero.apk`.

Tiene otro `applicationId` (`com.matterclub.tablero`), así que se puede tener
instalada junto con la de los dueños. Además no deja que se apague la pantalla
mientras está abierta. Igual que la otra, abre el sitio publicado: muestra lo
que esté en `main`.

## El aviso al dueño va por Telegram

Cuando entra una reserva, un disparador de la base le manda un mensaje al dueño
(`supabase/migraciones/003_aviso_telegram.sql`). El token del bot vive cifrado
en Vault, nunca en el código del sitio: cualquiera puede leer el JavaScript que
se descarga, y con ese token se pueden mandar mensajes haciéndose pasar por el
bot.

Va como disparador y no como código del navegador para que se dispare siempre,
sin depender de que el cliente no cierre la pestaña. Y si los secretos no están
cargados **no falla el insert**: perder el aviso es molesto, perder la reserva
del cliente es grave.

Al cliente se le avisa por WhatsApp, con el dueño apretando enviar. Automatizar
ese lado exigiría cuenta de empresa verificada, plantillas aprobadas y pago por
conversación.

## Qué falta

- [ ] **Confirmar el precio del turno fijo y de eventos.** El turno de 2 horas
      ya está en $5.555 por persona; esos dos siguen en "Consultar".
- [ ] Verificar la hora de apertura (asumimos 08:00; el cierre a medianoche sí
      está confirmado)
- [ ] **Decidir el plan de Supabase.** El gratuito pausa el proyecto tras una
      semana sin tráfico a la base, y ya pasó una vez: el hostname deja de
      resolver y el turnero queda muerto sin avisarle a nadie.
- [ ] Pantalla para cambiar la contraseña desde el panel. Hoy sólo se puede
      desde el dashboard de Supabase.
- [x] Turnero público con disponibilidad real
- [x] Login del encargado contra la tabla `encargados`
- [x] Aviso al dueño por Telegram cuando entra una reserva
- [x] Aviso por WhatsApp al confirmar, rechazar y avisar de un horario liberado
- [x] Turnos fijos semanales gestionables desde el panel
- [x] Lista de espera
- [x] PWA instalable
- [x] Fotos reales de Matter
