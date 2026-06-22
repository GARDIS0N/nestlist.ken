-- Enable UUID
create extension if not exists "uuid-ossp";

-- PROFILES
create table if not exists profiles (
  id           text primary key,
  full_name    text,
  phone        text,
  email        text,
  role         text check (role in (
    'landlord','caretaker','agent',
    'tenant','admin','superadmin'
  )),
  avatar_url   text,
  is_active    boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- PROPERTIES
create table if not exists properties (
  id             uuid primary key default uuid_generate_v4(),
  landlord_id    text references profiles(id) on delete cascade,
  title          text not null,
  description    text,
  location       text,
  county         text,
  type           text check (type in (
    'single_room','bedsitter','studio',
    '1br','2br','3br','4br','5br_plus'
  )),
  price          integer,
  amenities      text[] default '{}',
  images         text[] default '{}',
  is_active      boolean default false,
  is_featured    boolean default false,
  expires_at     timestamptz,
  view_count     integer default 0,
  inquiry_count  integer default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- LISTING PAYMENTS
create table if not exists listing_payments (
  id                        uuid primary key default uuid_generate_v4(),
  property_id               uuid references properties(id) on delete set null,
  landlord_id               text references profiles(id),
  amount                    integer not null,
  amount_paid               integer,
  property_type             text,
  status                    text default 'pending' check (
    status in ('pending','confirmed','failed','cancelled')
  ),
  mpesa_checkout_request_id text unique,
  mpesa_code                text,
  payer_phone               text,
  failure_reason            text,
  confirmed_at              timestamptz,
  created_at                timestamptz default now()
);

-- INQUIRIES
create table if not exists inquiries (
  id           uuid primary key default uuid_generate_v4(),
  property_id  uuid references properties(id) on delete cascade,
  tenant_id    text references profiles(id),
  landlord_id  text references profiles(id),
  message      text not null,
  tenant_name  text,
  tenant_phone text,
  tenant_email text,
  status       text default 'pending' check (
    status in ('pending','responded','closed')
  ),
  created_at   timestamptz default now()
);

-- SAVED PROPERTIES
create table if not exists saved_properties (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    text references profiles(id) on delete cascade,
  property_id  uuid references properties(id) on delete cascade,
  created_at   timestamptz default now(),
  unique(tenant_id, property_id)
);

-- SEARCH ALERTS
create table if not exists search_alerts (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    text references profiles(id) on delete cascade,
  county       text,
  type         text,
  max_price    integer,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

-- SMS LOGS
create table if not exists sms_logs (
  id               uuid primary key default uuid_generate_v4(),
  type             text,
  recipient_phone  text,
  message          text,
  status           text default 'sent',
  created_at       timestamptz default now()
);

-- INDEXES
create index if not exists idx_profiles_role
  on profiles(role);
create index if not exists idx_properties_landlord
  on properties(landlord_id);
create index if not exists idx_properties_active
  on properties(is_active);
create index if not exists idx_properties_county
  on properties(county);
create index if not exists idx_properties_type
  on properties(type);
create index if not exists idx_properties_expires
  on properties(expires_at);
create index if not exists idx_payments_landlord
  on listing_payments(landlord_id);
create index if not exists idx_payments_status
  on listing_payments(status);
create index if not exists idx_payments_checkout
  on listing_payments(mpesa_checkout_request_id);
create index if not exists idx_inquiries_landlord
  on inquiries(landlord_id);
create index if not exists idx_inquiries_tenant
  on inquiries(tenant_id);
create index if not exists idx_saved_tenant
  on saved_properties(tenant_id);

-- ROW LEVEL SECURITY
alter table profiles         enable row level security;
alter table properties       enable row level security;
alter table listing_payments enable row level security;
alter table inquiries        enable row level security;
alter table saved_properties enable row level security;
alter table search_alerts    enable row level security;
alter table sms_logs         enable row level security;

-- PROFILES POLICIES
create policy "profiles_public_read" on profiles
  for select using (true);
create policy "profiles_own_insert" on profiles
  for insert with check (auth.uid()::text = id);
create policy "profiles_own_update" on profiles
  for update using (auth.uid()::text = id);

-- PROPERTIES POLICIES
create policy "properties_public_read" on properties
  for select using (is_active = true);
create policy "properties_owner_all" on properties
  for all using (auth.uid()::text = landlord_id);

-- PAYMENTS POLICIES
create policy "payments_owner_read" on listing_payments
  for select using (auth.uid()::text = landlord_id);
create policy "payments_service_write" on listing_payments
  for all using (true);

-- INQUIRIES POLICIES
create policy "inquiries_participants" on inquiries
  for select using (
    auth.uid()::text = landlord_id or
    auth.uid()::text = tenant_id
  );
create policy "inquiries_create" on inquiries
  for insert with check (true);
create policy "inquiries_landlord_update" on inquiries
  for update using (auth.uid()::text = landlord_id);

-- SAVED PROPERTIES POLICIES
create policy "saved_own" on saved_properties
  for all using (auth.uid()::text = tenant_id);

-- SEARCH ALERTS POLICIES
create policy "alerts_own" on search_alerts
  for all using (auth.uid()::text = tenant_id);

-- TRIGGERS
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger properties_updated_at
  before update on properties
  for each row execute function update_updated_at();

create or replace function increment_inquiry_count()
returns trigger language plpgsql as $$
begin
  update properties
  set inquiry_count = inquiry_count + 1
  where id = new.property_id;
  return new;
end;
$$;

create trigger on_inquiry_created
  after insert on inquiries
  for each row execute function increment_inquiry_count();
