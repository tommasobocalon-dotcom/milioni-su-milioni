import { redirect } from "next/navigation";

/** Le segnalazioni stanno in Richieste clienti, con Accogli e Respingi sulla riga (27/11/2026). */
export default function ReportsPage() {
  redirect("/admin/richieste?filtro=segnalate");
}
