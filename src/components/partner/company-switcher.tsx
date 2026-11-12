import { switchCompany } from "@/app/area-partner/actions";
import { partnersOfUser, requirePartner } from "@/lib/auth/session";

/** Scelta dell'azienda, solo per gli account che ne hanno più di una. */
export async function CompanySwitcher() {
  const { user, partner } = await requirePartner({ allowSuspended: true });
  const all = await partnersOfUser(user.id);
  if (all.length < 2) return null;
  return (
    <form action={switchCompany} className="mb-6 flex flex-wrap items-center gap-2 rounded-lg bg-subtle p-3 text-body-s">
      <label htmlFor="azienda" className="font-semibold">
        Azienda
      </label>
      <select id="azienda" name="partnerId" defaultValue={partner.id} className="h-10 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 sm:flex-none">
        {all.map((p) => (
          <option key={p.id} value={p.id}>
            {p.displayName}
          </option>
        ))}
      </select>
      <button type="submit" className="h-10 rounded-md bg-primary px-4 font-semibold text-on-brand">
        Gestisci questa
      </button>
    </form>
  );
}
