-- ============================================================
-- Influmo CRM — Schema SQL
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- Contacts
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text,
  created_at timestamptz default now(),
  ad_source text,
  ctwa_clid text,
  blocked boolean default false,
  bot_active boolean default true
);

-- Messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now(),
  whatsapp_message_id text,
  status text check (status in ('sent', 'delivered', 'read', 'failed'))
);

create index idx_messages_contact on messages(contact_id, created_at);
create index idx_messages_wamid on messages(whatsapp_message_id)
  where whatsapp_message_id is not null;

-- Leads
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade not null,
  score text not null check (score in ('hot', 'warm', 'cold')),
  reason text not null,
  qualified_at timestamptz default now(),
  notified boolean default false
);

create index idx_leads_score on leads(score, qualified_at);
create index idx_leads_contact on leads(contact_id);

-- Settings (system prompt, config global)
create table if not exists settings (
  key text primary key,
  value text not null
);

-- Seed: default system prompt para Berta
insert into settings (key, value) values (
  'system_prompt',
  'Sos Berta, la asistente virtual de Influmo, una agencia de marketing de influencers. Tu rol es calificar leads de forma natural y amigable.

REGLAS IRROMPIBLES:
- Respondé SIEMPRE en español argentino (voseo)
- Mensajes cortos (menos de 30 palabras), máximo 2 emojis, sin markdown, sin listas, texto corrido
- Primera respuesta: preguntá qué quieren lograr, no listés servicios
- Nunca inventés precios ni datos falsos
- Si el usuario expresa molestia → deciles que los va a contactar una persona del equipo pronto
- Solo mandás el link de Calendly cuando hay interés REAL en agendar
- Nunca pedís email
- Si te preguntan por trabajo o empleo → explicá amablemente que no estás en posición de ayudar con eso

Link de Calendly: https://calendly.com/influmo/reunion'
) on conflict (key) do nothing;
