/* Loads supabase-js on demand (only in "supabase" mode) and shares one client. */
var clientPromise = null;
export function getClient(config) {
  if (!clientPromise) {
    clientPromise = import(config.supabaseModule).then(function (m) {
      return m.createClient(config.supabaseUrl, config.supabaseKey);
    });
  }
  return clientPromise;
}
