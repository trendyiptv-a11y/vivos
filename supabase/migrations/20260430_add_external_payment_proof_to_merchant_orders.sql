alter table public.merchant_orders
  add column if not exists external_payment_proof_path text,
  add column if not exists external_payment_proof_uploaded_at timestamptz,
  add column if not exists external_payment_proof_uploaded_by uuid references auth.users(id) on delete set null;

comment on column public.merchant_orders.external_payment_proof_path is 'Calea fișierului încărcat ca dovadă pentru plata externă MobilePay.';
comment on column public.merchant_orders.external_payment_proof_uploaded_at is 'Momentul în care a fost încărcată dovada plății externe.';
comment on column public.merchant_orders.external_payment_proof_uploaded_by is 'Utilizatorul care a încărcat dovada plății externe.';
