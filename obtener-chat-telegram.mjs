/**
 * Averigua el ID del chat al que el bot tiene que mandar los avisos.
 *
 *   node obtener-chat-telegram.mjs <token-del-bot>
 *
 * Antes de correrlo: abrí Telegram, buscá tu bot por su nombre de usuario y
 * mandale cualquier mensaje ("hola" sirve). Un bot no puede escribirle primero
 * a nadie — la conversación la tiene que arrancar la persona.
 *
 * El token queda en el historial del shell. Si te molesta, después:
 *   history -d $(history 1)
 */

const token = process.argv[2];

if (!token) {
  console.log("\nFalta el token. Uso:");
  console.log("  node obtener-chat-telegram.mjs 123456789:AAxxxxxxxxxxxxx\n");
  process.exit(1);
}

const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
const datos = await res.json();

if (!datos.ok) {
  console.log(`\nTelegram rechazó el token: ${datos.description}\n`);
  process.exit(1);
}

const chats = new Map();
for (const u of datos.result ?? []) {
  const c = u.message?.chat ?? u.channel_post?.chat;
  if (c) chats.set(c.id, c);
}

console.log("");
if (chats.size === 0) {
  console.log("El bot todavía no recibió ningún mensaje.");
  console.log("Abrí Telegram, buscá tu bot, mandale 'hola' y volvé a correr esto.\n");
  process.exit(1);
}

for (const c of chats.values()) {
  const quien = c.title ?? [c.first_name, c.last_name].filter(Boolean).join(" ");
  console.log(`  chat_id: ${c.id}`);
  console.log(`  de:      ${quien}${c.username ? ` (@${c.username})` : ""}`);
  console.log(`  tipo:    ${c.type}`);
  console.log("");
}

if (chats.size > 1) {
  console.log("Hay más de un chat. Elegí el del dueño (o el del grupo del club).\n");
}
