-- Esquema inicial del turnero de Matter.
--
-- Se corre pegándolo en el SQL Editor de Supabase (panel del proyecto).
--
-- Dos ideas sostienen todo el archivo:
--
-- 1. La base es la que impide que se pisen dos reservas. No el código del
--    navegador, que siempre llega tarde: entre que el cliente pregunta "¿está
--    libre?" y que manda el insert, otro pudo haber reservado.
--
-- 2. El público NO puede leer la tabla de reservas. Necesita saber qué horarios
--    están tomados, pero no quién los tomó: los nombres y teléfonos de los
--    clientes no son información pública. Eso se resuelve con una vista que
--    expone sólo los rangos ocupados.

-- Necesaria para poder mezclar un igual (=) con un solapamiento (&&) en el
-- mismo constraint de exclusión.
create extension if not exists btree_gist;


-- ---------------------------------------------------------------------------
-- Canchas
-- ---------------------------------------------------------------------------
-- Hoy hay una sola. Está como tabla para que sumar otra (u otro club) sea
-- insertar una fila y no rehacer el modelo.

create table if not exists canchas (
  id    text primary key,
  nombre text not null,
  activa boolean not null default true
);

insert into canchas (id, nombre)
values ('matter-1', 'Matter · Cancha 1')
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- Reservas
-- ---------------------------------------------------------------------------
-- Un turno concreto, con fecha y hora reales. La app razona en "jornada +
-- bloque", pero la base guarda instantes: es lo único que no se presta a
-- ambigüedad y lo que permite el constraint de abajo.

create table if not exists reservas (
  id         uuid primary key default gen_random_uuid(),
  cancha_id  text not null references canchas (id),
  inicio     timestamptz not null,
  fin        timestamptz not null,
  estado     text not null default 'pendiente',
  nombre     text not null,
  telefono   text not null,
  nota       text,
  creada     timestamptz not null default now(),

  constraint reservas_estado_valido
    check (estado in ('pendiente', 'confirmada', 'rechazada', 'bloqueo')),
  constraint reservas_fin_despues_del_inicio
    check (fin > inicio),
  constraint reservas_nombre_no_vacio
    check (length(trim(nombre)) >= 3)
);

-- EL constraint importante.
--
-- Impide que dos reservas que ocupan la cancha se solapen en el tiempo. Un
-- insert que pise a otro falla en la base, aunque lleguen en el mismo
-- milisegundo desde dos celulares distintos.
--
-- El WHERE es lo que lo hace usable: las rechazadas no ocupan nada, así que un
-- horario que se liberó se puede volver a pedir.
alter table reservas drop constraint if exists reservas_sin_solapamiento;
alter table reservas add constraint reservas_sin_solapamiento
  exclude using gist (
    cancha_id with =,
    tstzrange(inicio, fin) with &&
  )
  where (estado in ('pendiente', 'confirmada', 'bloqueo'));

create index if not exists reservas_por_inicio on reservas (cancha_id, inicio);


-- ---------------------------------------------------------------------------
-- Turnos fijos
-- ---------------------------------------------------------------------------
-- La regla semanal ("los martes a las 20"), no una fila por semana. La grilla
-- la expande al dibujarse.
--
-- Dar de baja llena `hasta` en vez de borrar: las semanas pasadas tienen que
-- seguir mostrando el turno, porque ese grupo efectivamente jugó.

create table if not exists turnos_fijos (
  id         uuid primary key default gen_random_uuid(),
  cancha_id  text not null references canchas (id),
  dia_semana smallint not null,   -- 0 = lunes … 6 = domingo
  bloque     smallint not null,   -- índice del turno dentro del día
  nombre     text not null,
  telefono   text not null default '',
  desde      date not null,
  hasta      date,                -- null = sigue vigente
  creado     timestamptz not null default now(),

  constraint fijos_dia_valido check (dia_semana between 0 and 6),
  constraint fijos_bloque_valido check (bloque >= 0),
  constraint fijos_hasta_despues_de_desde check (hasta is null or hasta >= desde)
);

-- No puede haber dos turnos fijos vigentes en el mismo día y horario. Los
-- vencidos no molestan, por eso el índice es parcial.
create unique index if not exists fijos_vigente_unico
  on turnos_fijos (cancha_id, dia_semana, bloque)
  where hasta is null;


-- ---------------------------------------------------------------------------
-- Lista de espera
-- ---------------------------------------------------------------------------

create table if not exists esperas (
  id        uuid primary key default gen_random_uuid(),
  cancha_id text not null references canchas (id),
  inicio    timestamptz not null,
  nombre    text not null,
  telefono  text not null,
  creada    timestamptz not null default now()
);

create index if not exists esperas_por_inicio on esperas (cancha_id, inicio);


-- ---------------------------------------------------------------------------
-- Vista pública de disponibilidad
-- ---------------------------------------------------------------------------
-- Lo único que el público puede leer de las reservas: qué rangos están tomados.
-- Sin nombres, sin teléfonos, sin notas.
--
-- security_invoker = off (el default en vistas normales) hace que la vista lea
-- la tabla con los permisos de su dueño, salteando el RLS de `reservas`. Es
-- justamente lo que queremos: dejar pasar los horarios y nada más.

create or replace view disponibilidad as
  select cancha_id, inicio, fin
  from reservas
  where estado in ('pendiente', 'confirmada', 'bloqueo');

-- Los turnos fijos también ocupan la cancha, así que el público necesita
-- conocerlos o vería libre un horario que está dado todas las semanas.
--
-- No se expanden acá: expandir una regla semanal en SQL obligaría a elegir
-- hasta qué fecha generar filas. Se publica la regla desnuda —sin nombre ni
-- teléfono— y la grilla la expande en el navegador, que es lo que ya hace.
create or replace view fijos_publicos as
  select cancha_id, dia_semana, bloque, desde, hasta
  from turnos_fijos;


-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
-- Regla general: el visitante anónimo puede mirar disponibilidad y pedir un
-- turno. Todo lo demás es del encargado, que entra con usuario y contraseña.

alter table reservas     enable row level security;
alter table turnos_fijos enable row level security;
alter table esperas      enable row level security;
alter table canchas      enable row level security;

-- Sin políticas de SELECT para anon sobre `reservas`: el anónimo no lee ni una
-- fila de esa tabla. Su única ventana es la vista `disponibilidad`.
grant select on disponibilidad to anon, authenticated;
grant select on fijos_publicos to anon, authenticated;

-- Cualquiera puede ver qué canchas hay.
drop policy if exists canchas_lectura_publica on canchas;
create policy canchas_lectura_publica on canchas
  for select to anon, authenticated using (true);

-- Cualquiera puede pedir un turno, pero sólo como "pendiente" y sólo a futuro.
-- Sin el chequeo de estado, alguien podría insertarse una reserva ya
-- confirmada y saltearse al encargado.
drop policy if exists reservas_pedido_publico on reservas;
create policy reservas_pedido_publico on reservas
  for insert to anon
  with check (
    estado = 'pendiente'
    and inicio > now()
  );

-- El encargado hace lo que quiera con las reservas.
drop policy if exists reservas_gestion_encargado on reservas;
create policy reservas_gestion_encargado on reservas
  for all to authenticated
  using (true) with check (true);

-- Los turnos fijos los ve y los toca sólo el encargado. El público no los
-- necesita: su efecto ya aparece en `disponibilidad`.
drop policy if exists fijos_gestion_encargado on turnos_fijos;
create policy fijos_gestion_encargado on turnos_fijos
  for all to authenticated
  using (true) with check (true);

-- Anotarse en la lista de espera es público; leerla, no.
drop policy if exists esperas_alta_publica on esperas;
create policy esperas_alta_publica on esperas
  for insert to anon
  with check (inicio > now());

drop policy if exists esperas_gestion_encargado on esperas;
create policy esperas_gestion_encargado on esperas
  for all to authenticated
  using (true) with check (true);
