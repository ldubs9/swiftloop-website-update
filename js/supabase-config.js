/* ============================================================
   SwiftLoop — Supabase connection (public anon key only)
   ------------------------------------------------------------
   Values from Supabase → Project Settings → API.
   The anon key is safe to ship to the browser: Row Level
   Security (see supabase/schema.sql) restricts it to reading
   PUBLISHED, already-dated articles only.
   ============================================================ */
window.SUPABASE_CONFIG = {
  url: "https://sldb.swiftloop.tech",
  anonKey:
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3NTgzMjI0MCwiZXhwIjo0OTMxNTA1ODQwLCJyb2xlIjoiYW5vbiJ9.G7a98S-SVHYk1h5hU2VjVmbu_RF42KOK8jVDrR1kOZM",
};
