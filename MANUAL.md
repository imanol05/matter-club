# Matter · manual de operación

Lo que hay que saber para usar y arreglar el turnero. Escrito para leerlo
apurado, cuando algo no anda.

**Acá no hay contraseñas ni el token del bot.** Eso no va en un archivo: una vez
ya se filtró así.

---

## Direcciones

| Qué | Dónde |
|---|---|
| La página, para los clientes | https://matterclub.netlify.app/ |
| El panel de los dueños | https://matterclub.netlify.app/admin |
| Base de datos | https://supabase.com/dashboard/project/wabbodvqlzmuanrsuzfn |
| Hosting | https://app.netlify.com/projects/matterclub |
| Código | https://github.com/imanol05/matter-club |

El proyecto local está en `~/Documentos/Claude/matter-club`.

---

## Quién entra y cómo

Los **clientes** no instalan nada: entran a la página, miran los horarios libres
y piden el suyo.

Los **dueños** usan el panel. Según el teléfono:

- **Android** — se les pasa el archivo `matter-panel.apk`. Android va a avisar
  que el archivo puede ser peligroso: es porque no viene de la Play Store, hay
  que permitir "orígenes desconocidos" esa vez.
- **iPhone** — no hay APK posible (haría falta una Mac y la cuenta de
  desarrollador de Apple). Se abre `/admin` **en Safari**, botón de compartir,
  "Agregar a inicio". Queda igual que una app.

  Que lo agregue parado en `/admin` y no en la portada: iOS usa la página en la
  que estás como punto de arranque.

Para entrar al panel no alcanza con tener usuario: hay que estar además en la
tabla `encargados`. Son dos pasos y el segundo se olvida fácil.

---

## Cómo funciona, en una línea

Cliente pide un turno → se guarda en Supabase → llega un aviso al grupo de
Telegram → un dueño lo confirma desde el panel → se abre WhatsApp para avisarle
al cliente.

---

## Tareas comunes

### Cambiar el precio

Está en `lib/club.ts`, en `TARIFAS`. Al lado, `PRECIOS_VIGENTES_DESDE`:
**actualizá siempre los dos juntos**. Una tarifa sin fecha no sirve para zanjar
un reclamo de alguien que llegó con el número viejo.

Después `git push` y listo.

### Publicar cualquier cambio

```bash
git push
```

Eso es todo: Netlify compila solo con cada push a `main` y en menos de un minuto
está arriba. No hay script de deploy.

### Agregar un dueño

1. Supabase → Authentication → Users → **Add user** → Create new user.
   **Tildar "Auto Confirm User"**, si no no puede entrar.
2. SQL Editor:

```sql
insert into encargados (user_id, nombre)
select id, 'NOMBRE' from auth.users where email = 'EL_MAIL'
on conflict (user_id) do nothing;
```

3. Verificar:

```sql
select e.nombre, u.email, u.email_confirmed_at is not null as confirmado
from encargados e join auth.users u on u.id = e.user_id order by e.nombre;
```

### Cambiarle la contraseña a alguien

Por ahora sólo desde Supabase → Authentication → Users → el usuario. El panel
todavía no tiene esa pantalla.

### Recompilar el APK

```bash
npm run apk
```

Queda en `matter-panel.apk`. Sólo hace falta si cambia la URL del panel: como la
app carga el sitio de internet, las actualizaciones de la página le llegan solas
sin reinstalar nada.

---

## Cuando algo falla

### No anda nada: el turnero no carga, el panel no deja entrar

**Lo más probable: Supabase pausó el proyecto.** El plan gratuito lo apaga tras
una semana sin movimiento en la base. Se nota porque la dirección deja de existir:

```bash
getent hosts wabbodvqlzmuanrsuzfn.supabase.co
```

Si no devuelve nada, es eso. Se arregla entrando al panel de Supabase y dándole
**Resume project**. Tarda unos dos minutos. **No se pierde ningún dato.**

La solución de fondo es pasar a Supabase Pro, que no se pausa.

### Dejaron de llegar los avisos de Telegram

Lo más probable es que Telegram haya convertido el grupo en *supergrupo*, y al
hacerlo **le cambia el identificador**. No da ningún error: simplemente dejan de
llegar.

Se saca el identificador nuevo y se actualiza:

```bash
node obtener-chat-telegram.mjs EL_TOKEN
```

El del grupo es un número **negativo**. Después, en el SQL Editor:

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'telegram_chat_id'),
  '-100XXXXXXXXXX'
);
```

Para que el bot aparezca en esa lista hay que mandar un comando en el grupo
(`/start@elbot`): por defecto los bots no ven los mensajes comunes.

### Un horario figura ocupado y nadie lo reservó

Era un pedido que alguien hizo y nadie respondió. Un pedido pendiente bloquea el
horario —tiene que ser así, si no dos grupos piden lo mismo— y desde octubre de
2026 se vencen solos a las 48 horas.

Si hace falta liberarlo ya, en el SQL Editor:

```sql
select vencer_pendientes();
```

Devuelve cuántos liberó.

### Hay que cambiar el token del bot

Se revoca en **@BotFather** con `/revoke` y se carga el nuevo:

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'telegram_bot_token'),
  'EL_TOKEN_NUEVO'
);
```

El `chat_id` no se toca, ese es del grupo. Y revocar no rompe nada: la función
lee el token en cada reserva.

**Cuidado con verificar mal.** `select name from vault.secrets` sólo lista
nombres, y los nombres ya estaban. Eso no prueba que el token nuevo sirva. Lo
único que lo prueba es pedir un turno y ver si llega el mensaje.

---

## Qué falta

- **Decidir el plan de Supabase.** El gratuito se apaga solo y nadie avisa; te
  enterás por un cliente que no pudo reservar.
- **Precios del turno fijo y de eventos.** Siguen en "Consultar".
- **Confirmar el horario de apertura.** Las 08:00 las pusimos nosotros; el
  cierre a medianoche sí está confirmado.
- **Pantalla para cambiar la contraseña** desde el panel.
- **Cancelación por parte del cliente.** Hoy tiene que escribir por WhatsApp y
  que un dueño lo rechace a mano.
