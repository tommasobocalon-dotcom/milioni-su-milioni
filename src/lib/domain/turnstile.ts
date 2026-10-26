/**
 * Cloudflare Turnstile (antispam senza "seleziona i semafori"): il browser ottiene un token, il server lo
 * verifica qui. Senza chiave segreta (sviluppo, test) il controllo è spento.
 */
export async function checkTurnstile(
  token: string,
  opts: { secret: string | undefined; ip: string; fetch?: typeof fetch },
): Promise<boolean> {
  if (!opts.secret) return true;
  if (!token) return false;
  try {
    const res = await (opts.fetch ?? fetch)("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: opts.secret, response: token, remoteip: opts.ip }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    // Meglio chiedere di riprovare che far passare un bot quando Cloudflare non risponde.
    return false;
  }
}
