/** Richieste all'API di Brevo (SMS ed email transazionali). Solo costruzione: l'invio sta in src/lib/notify. */

const API = "https://api.brevo.com/v3";

type Request = { url: string; init: RequestInit };

const headers = (apiKey: string) => ({ "api-key": apiKey, "content-type": "application/json", accept: "application/json" });

export function brevoSmsRequest({ apiKey, sender, to, text }: { apiKey: string; sender: string; to: string; text: string }): Request {
  // Brevo accetta come mittente al massimo 11 caratteri alfanumerici (o un numero di 15 cifre).
  if (!/^[A-Za-z0-9]{1,11}$/.test(sender) && !/^\d{12,15}$/.test(sender)) {
    throw new Error(`Mittente SMS "${sender}" non valido: massimo 11 lettere o cifre`);
  }
  return {
    url: `${API}/transactionalSMS/sms`,
    init: {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({ type: "transactional", sender, recipient: to.replace(/^\+/, ""), content: text }),
    },
  };
}

export function brevoEmailRequest({
  apiKey,
  from,
  fromName,
  to,
  subject,
  text,
  replyTo,
}: {
  apiKey: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  /** Dove arrivano le risposte (es. la casella dell'assistenza). */
  replyTo?: string;
}): Request {
  return {
    url: `${API}/smtp/email`,
    init: {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({ sender: { email: from, name: fromName }, to: [{ email: to }], subject, textContent: text, ...(replyTo ? { replyTo: { email: replyTo } } : {}) }),
    },
  };
}
