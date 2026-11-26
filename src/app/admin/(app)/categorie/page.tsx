import { Suspense } from "react";
import Link from "next/link";
import { AdminPageHeader, AdminSkeleton, Panel } from "@/components/admin/ui";
import { Field, Input, Select } from "@/components/ui/field";
import { CategoryIcon } from "@/components/site/category-icon";
import { requireAdmin } from "@/lib/auth/session";
import { listCategoriesAdmin } from "@/lib/data/taxonomy-admin";
import { CATEGORY_ICONS, PARTNER_TYPE_LABEL, PARTNER_TYPES } from "@/lib/domain/taxonomy";
import { createCategoryAction } from "@/app/admin/taxonomy-actions";
import { ActionForm } from "./forms";
import { ICON_LABEL } from "./labels";

export const metadata = { title: "Categorie" };

export default function CategoriesPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Categories />
    </Suspense>
  );
}

async function Categories() {
  await requireAdmin();
  const rows = await listCategoriesAdmin();
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title="Categorie" subtitle="Mestieri e agenzie, servizi del listino e domande del modulo di richiesta" />
      <Panel title="Tutte le categorie">
        <ul className="divide-y divide-line">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/categorie/${c.id}`} className="grid gap-1 px-5 py-3 text-body-s hover:bg-subtle md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4">
                <span className="flex min-w-0 items-center gap-3">
                  <CategoryIcon name={c.icon} className="size-5 shrink-0 text-primary" />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">{c.name}</span>
                    <span className="truncate text-caption text-ink-2">
                      {PARTNER_TYPE_LABEL[c.partnerType]} · /{c.slug}
                    </span>
                  </span>
                </span>
                <span className="text-caption text-ink-2">
                  {c.services} servizi · {c.questions} domande · {c.online} aziende online su {c.partners}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Nuova categoria">
        <div className="p-5">
          <ActionForm action={createCategoryAction} submit="Crea la categoria">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome" htmlFor="cat-name" required help="Al singolare, es. «Elettricista»">
                <Input id="cat-name" name="name" required minLength={2} maxLength={60} />
              </Field>
              <Field label="Nome al plurale" htmlFor="cat-plural" required help="Nei titoli, es. «Elettricisti a Treviso»">
                <Input id="cat-plural" name="pluralName" required minLength={2} maxLength={60} />
              </Field>
              <Field label="Tipo di azienda" htmlFor="cat-type" required help="Non si cambia dopo: decide indirizzi e modulo delle aziende">
                <Select id="cat-type" name="partnerType" defaultValue="artisan">
                  {PARTNER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {PARTNER_TYPE_LABEL[t]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Icona" htmlFor="cat-icon" required>
                <Select id="cat-icon" name="icon" defaultValue="wrench">
                  {CATEGORY_ICONS.map((i) => (
                    <option key={i} value={i}>
                      {ICON_LABEL[i]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <p className="text-caption text-ink-2">L&apos;indirizzo (es. /elettricista/treviso) si crea dal nome e non cambia più, anche se poi rinomini la categoria.</p>
          </ActionForm>
        </div>
      </Panel>
    </div>
  );
}
