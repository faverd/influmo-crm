-- ============================================================
-- CONSULTOR BOT IA — Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable pgvector extension for embeddings
create extension if not exists vector;

-- ============================================================
-- BOTS: Configuration for each AI assistant
-- ============================================================
create table if not exists bots (
  id                  uuid default gen_random_uuid() primary key,
  name                text not null,
  description         text default '',
  mode                text default 'general'
                      check (mode in ('general', 'sales', 'technical', 'agronomo')),
  provider            text default 'openai'
                      check (provider in ('openai', 'gemini', 'openrouter')),
  model               text not null default 'gpt-4o-mini',
  api_key             text default '',
  embedding_key       text default '',
  temperature         numeric(3,2) default 0.70
                      check (temperature >= 0 and temperature <= 2),
  max_tokens          integer default 2048,
  personality         text default '',
  language            text default 'es',
  system_prompt       text default '',
  is_active           boolean default true,
  avatar_color        text default '#f5a623',
  total_conversations integer default 0,
  total_messages      integer default 0,
  total_tokens        bigint default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ============================================================
-- BOT_DOCUMENTS: Files & URLs uploaded to train bots
-- ============================================================
create table if not exists bot_documents (
  id            uuid default gen_random_uuid() primary key,
  bot_id        uuid references bots(id) on delete cascade not null,
  name          text not null,
  type          text not null
                check (type in ('pdf', 'docx', 'xlsx', 'txt', 'url', 'text')),
  file_path     text,
  original_url  text,
  raw_content   text,
  file_size     bigint default 0,
  chunk_count   integer default 0,
  status        text default 'pending'
                check (status in ('pending', 'processing', 'ready', 'error')),
  error_message text,
  created_at    timestamptz default now()
);

-- ============================================================
-- BOT_CHUNKS: Text chunks with vector embeddings (RAG)
-- ============================================================
create table if not exists bot_chunks (
  id           uuid default gen_random_uuid() primary key,
  document_id  uuid references bot_documents(id) on delete cascade not null,
  bot_id       uuid references bots(id) on delete cascade not null,
  content      text not null,
  embedding    vector(1536),
  chunk_index  integer default 0,
  created_at   timestamptz default now()
);

-- IVFFlat index for fast cosine similarity search
create index if not exists bot_chunks_embedding_idx
  on bot_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ============================================================
-- BOT_CONVERSATIONS: Chat sessions
-- ============================================================
create table if not exists bot_conversations (
  id            uuid default gen_random_uuid() primary key,
  bot_id        uuid references bots(id) on delete cascade not null,
  user_id       uuid references auth.users(id),
  title         text default 'Nueva conversación',
  message_count integer default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- BOT_MESSAGES: Individual messages in conversations
-- ============================================================
create table if not exists bot_messages (
  id              uuid default gen_random_uuid() primary key,
  conversation_id uuid references bot_conversations(id) on delete cascade not null,
  bot_id          uuid references bots(id) on delete cascade not null,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  tokens_used     integer default 0,
  sources         jsonb default '[]'::jsonb,
  created_at      timestamptz default now()
);

-- ============================================================
-- RLS Policies
-- ============================================================
alter table bots              enable row level security;
alter table bot_documents     enable row level security;
alter table bot_chunks        enable row level security;
alter table bot_conversations enable row level security;
alter table bot_messages      enable row level security;

create policy "auth_bots"              on bots              for all using (auth.role() in ('authenticated','service_role'));
create policy "auth_bot_documents"     on bot_documents     for all using (auth.role() in ('authenticated','service_role'));
create policy "auth_bot_chunks"        on bot_chunks        for all using (auth.role() in ('authenticated','service_role'));
create policy "auth_bot_conversations" on bot_conversations for all using (auth.role() in ('authenticated','service_role'));
create policy "auth_bot_messages"      on bot_messages      for all using (auth.role() in ('authenticated','service_role'));

-- ============================================================
-- Vector similarity search function
-- ============================================================
create or replace function match_bot_chunks(
  query_embedding  vector(1536),
  match_bot_id     uuid,
  match_threshold  float default 0.60,
  match_count      int   default 6
)
returns table(
  id          uuid,
  content     text,
  document_id uuid,
  similarity  float
)
language sql stable as $$
  select
    bc.id,
    bc.content,
    bc.document_id,
    1 - (bc.embedding <=> query_embedding) as similarity
  from bot_chunks bc
  where bc.bot_id = match_bot_id
    and 1 - (bc.embedding <=> query_embedding) > match_threshold
  order by bc.embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================================
-- Supabase Storage bucket for bot documents
-- ============================================================
insert into storage.buckets (id, name, public)
values ('bot-documents', 'bot-documents', true)
on conflict (id) do nothing;

create policy "bot_docs_upload"
  on storage.objects for insert
  with check (bucket_id = 'bot-documents' and auth.role() = 'authenticated');

create policy "bot_docs_read"
  on storage.objects for select
  using (bucket_id = 'bot-documents');

create policy "bot_docs_delete"
  on storage.objects for delete
  using (bucket_id = 'bot-documents' and auth.role() = 'authenticated');
