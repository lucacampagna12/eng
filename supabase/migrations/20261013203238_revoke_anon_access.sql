-- Defense in depth: the anonymous role must not read or write any app table directly.
-- (RLS already blocks every row for anon; this also removes the table privileges that
-- projects created before the 2026 Data API change grant by default.)
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;
