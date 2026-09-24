-- Needed for gen_random_uuid() / gen_random_bytes() used throughout.
create extension if not exists pgcrypto with schema extensions;
