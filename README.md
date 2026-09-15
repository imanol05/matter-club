# Matter Club · turnero de la cancha

Web + turnero para reservar la cancha de vóley. Next.js 16 (App Router) +
Tailwind 4 + TypeScript.

```bash
npm run dev     # http://localhost:3000
npm run build   # build de producción
npx eslint .    # lint
./deploy.sh     # compila y publica en GitHub Pages
```

Publicado en <https://imanol05.github.io/matter-club/>

## Pantallas

| Ruta      | Qué es                                                                   |
| --------- | ------------------------------------------------------------------------ |
| `/`       | Landing: presentación, características, tarifas, ubicación               |
| `/turnos` | Turnero público: se pide turno, o se anota en lista de espera si no hay  |
| `/admin`  | Panel del encargado: pedidos, lista de espera, turnos fijos y la agenda  |

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

## Estado actual: es una demo

**No hay backend.** Los datos viven en `localStorage` del navegador y arrancan
de una agenda de ejemplo (`lib/semilla.ts`) que se genera relativa a la semana
actual, así la demo se ve igual de realista se abra el día que se abra. El botón
"Reiniciar datos de ejemplo" del panel vuelve todo a cero.

La frontera está en `lib/store.tsx`: es lo único que consumen las pantallas.
Cuando entre Supabase se reimplementa ese hook y los componentes no se tocan.

## Dos decisiones que conviene no romper

**La grilla se arma por jornada, no por día calendario.** Hoy Matter cierra a
las 24:00 y las dos cosas coinciden, pero si alguna vez estiran el horario
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

## Qué falta

- [ ] **Confirmar la tarifa.** Los $5.600 por persona salen de un turno suelto,
      no los validó el club. Los dueños todavía tienen que definir el precio.
- [ ] Fotos reales de Matter (hay marcadores de posición en `/` y en el mapa)
- [ ] Verificar la hora de apertura (asumimos 08:00; el cierre a las 24:00 sí
      está confirmado)
- [ ] Supabase: reemplazar `lib/almacen.ts` por consultas reales
- [ ] **Login del encargado.** Hoy `/admin` está abierto, pero no es un agujero:
      los datos viven en el navegador de cada uno, así que un curioso sólo ve su
      propia copia. Deja de ser cierto el día que haya backend compartido — ahí
      pasa a ser obligatorio y va *antes* que Supabase.
- [ ] PWA instalable
- [x] Aviso por WhatsApp al confirmar, rechazar y avisar de un horario liberado
- [x] Turnos fijos semanales gestionables desde el panel
- [x] Lista de espera
