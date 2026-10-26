import "server-only";
import { checkTurnstile } from "@/lib/domain/turnstile";
import { clientIp } from "./ip-limit";

export const TURNSTILE_ERROR = "Non siamo riusciti a verificare che tu non sia un programma automatico. Riprova.";

/** Token del widget Turnstile valido? Sempre vero se TURNSTILE_SECRET_KEY non è impostata. */
export async function turnstileOk(token: string | undefined): Promise<boolean> {
  return checkTurnstile(token ?? "", { secret: process.env.TURNSTILE_SECRET_KEY, ip: await clientIp() });
}
