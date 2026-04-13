-- OutcallsAI - Schema initial
-- Agences, campagnes, locataires, appels

-- Agencies (one account per agency)
create table if not exists agencies (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text unique not null,
    password_hash text not null,
    phone text,
    caller_id text, -- numéro affiché lors des appels sortants
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Campaigns
create table if not exists campaigns (
    id uuid primary key default gen_random_uuid(),
    agency_id uuid not null references agencies(id) on delete cascade,
    name text not null,
    status text not null default 'draft' check (status in ('draft', 'running', 'paused', 'completed', 'cancelled')),
    call_window_start time default '09:00',
    call_window_end time default '18:00',
    call_days text[] default '{mon,tue,wed,thu,fri}',
    max_concurrent_calls int default 5,
    max_attempts int default 3,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Tenants (locataires importés par CSV)
create table if not exists tenants (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    name text not null,
    phone text not null,
    property_address text not null,
    amount_due numeric(10, 2) not null,
    due_date date not null,
    status text not null default 'pending' check (status in (
        'pending', 'will_pay', 'cant_pay', 'no_answer',
        'voicemail', 'bad_number', 'busy', 'refuses',
        'call_dropped', 'paid', 'escalated'
    )),
    status_notes text,
    promised_date date,
    attempt_count int default 0,
    last_called_at timestamptz,
    next_retry_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Calls (log de chaque tentative d'appel)
create table if not exists calls (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references tenants(id) on delete cascade,
    campaign_id uuid not null references campaigns(id) on delete cascade,
    status text not null default 'initiated' check (status in (
        'initiated', 'ringing', 'answered', 'completed',
        'no_answer', 'busy', 'failed', 'voicemail'
    )),
    duration_seconds int,
    transcript text,
    summary text,
    ai_status_result text, -- le statut déterminé par l'IA (will_pay, cant_pay, etc.)
    ai_notes text,         -- notes structurées de l'IA
    sip_call_id text,
    error_message text,
    started_at timestamptz default now(),
    ended_at timestamptz
);

-- Index pour les requêtes fréquentes
create index if not exists idx_tenants_campaign on tenants(campaign_id);
create index if not exists idx_tenants_status on tenants(status);
create index if not exists idx_tenants_next_retry on tenants(next_retry_at) where next_retry_at is not null;
create index if not exists idx_calls_tenant on calls(tenant_id);
create index if not exists idx_calls_campaign on calls(campaign_id);
create index if not exists idx_campaigns_agency on campaigns(agency_id);

-- RLS policies
alter table agencies enable row level security;
alter table campaigns enable row level security;
alter table tenants enable row level security;
alter table calls enable row level security;
