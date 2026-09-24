# Matter Club · turnero de la cancha

Web + turnero para reservar la cancha de vóley. Next.js 16 (App Router) +
Tailwind 4 + TypeScript.

```bash
npm run dev     # http://localhost:3000
npm run build   # build de producción
npx eslint .    # lint
./deploy.sh     # compila y publica en GitHub Pages
npm run apk     # genera matter-panel.apk para los dueños
```

Publicado en <https://imanol05.github.io/matter-club/>

## Pantallas

| Ruta      | Qué es                                                                  |
| --------- | ----------------------------------------------------------------------- |
| `/`       | Landing: presentación, características, tarifas, ubicación              |
| `/turnos` | Selector de horario que termina en WhatsApp (ver abajo)                 |
| `/admin`  | Panel del encargado — vista previa con datos de ejemplo, `noindex`      |

## Por qué el turnero público no muestra disponibilidad

Sin base de datos no hay forma de saber qué está ocupado. Pintar disponibilidad
inventada sería peor que no mostrar nada: alguien vería libre un horario que
está dado, o al revés, y terminaría en dos grupos peleando la cancha.

Entonces `/turnos` usa `<TurneroConsulta />`, que muestra la semana y los
bloques de 2 horas pero **no** dice qué está tomado: al elegir un horario abre
WhatsApp con el día y la hora ya escritos. Honesto y encima le ahorra al cliente
la parte tediosa de redactar.

`<Turnero />` — el de verdad, con ocupación, turnos fijos y lista de espera — ya
está hecho y andando, pero hoy sólo se usa en `/admin` contra datos de ejemplo.
El día que entre Supabase se cambia el componente en `/turnos` y listo.

Lo mismo vale para `<ProximosLibres />`, `<DialogoReserva />` y
`<DialogoEspera />`: funcionan, están esperando backend.

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

**El solapamiento de reservas se previene en la base, no en el código.** La demo
hace un chequeo optimista en `lib/almacen.ts`, que alcanza para un solo
navegador. En producción va un constraint de exclusión de Postgres sobre el
rango horario: es lo único que aguanta dos personas tocando el mismo horario en
el mismo instante.

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

## Qué falta

- [ ] **Aviso al dueño por Telegram cuando entra una reserva.** El token del bot
      no puede vivir en el código del sitio, así que va en una Edge Function.
- [ ] **Confirmar la tarifa.** Hoy las tres dicen "Consultar".
- [ ] Fotos reales de Matter
- [ ] Verificar la hora de apertura (asumimos 08:00; el cierre a medianoche sí
      está confirmado)
- [ ] **Login del encargado.** Hoy `/admin` está abierto, pero no es un agujero:
      los datos viven en el navegador de cada uno, así que un curioso sólo ve su
      propia copia. Deja de ser cierto el día que haya backend compartido — ahí
      pasa a ser obligatorio y va *antes* que Supabase.
- [ ] PWA instalable
- [x] Aviso por WhatsApp al confirmar, rechazar y avisar de un horario liberado
- [x] Turnos fijos semanales gestionables desde el panel
- [x] Lista de espera
