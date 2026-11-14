/* App configuration. mode: "supabase" (accounts + database) or "demo" (browser only, no server).
   The publishable key is meant to be public: access is limited by row level security in the database. */
export const CONFIG = {
  mode: "supabase",
  supabaseUrl: "https://ttiwidzjwmojuvvpwodd.supabase.co",
  supabaseKey: "sb_publishable_8aDGga3BNbpIe5m_2g9iAQ_QphSu9xq",
  supabaseModule: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
};
