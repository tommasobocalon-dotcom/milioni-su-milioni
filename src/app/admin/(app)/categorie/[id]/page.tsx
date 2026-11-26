import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AdminPageHeader, AdminSkeleton, Empty, Panel } from "@/components/admin/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth/session";
import { getCategoryAdmin, type CategoryAdmin } from "@/lib/data/taxonomy-admin";
import { PRICE_UNIT_LABEL } from "@/lib/domain/format";
import { CATEGORY_ICONS, formatOptions, PARTNER_TYPE_LABEL, PRICE_UNITS, QUESTION_TYPE_LABEL, QUESTION_TYPES } from "@/lib/domain/taxonomy";
import {
  createQuestionAction,
  createServiceAction,
  deleteCategoryAction,
  deleteQuestionAction,
  deleteServiceAction,
  updateCategoryAction,
  updateQuestionAction,
  updateServiceAction,
} from "@/app/admin/taxonomy-actions";
import { ActionForm, DeleteForm } from "../forms";
import { ICON_LABEL } from "../labels";

export const metadata = { title: "Categoria" };

export default function CategoryPage({ params }: PageProps<"/admin/categorie/[id]">) {
  return <Suspense fallback={<AdminSkeleton />}>{params.then(({ id }) => <Category id={id} />)}</Suspense>;
}

async function Category({ id }: { id: string }) {
  await requireAdmin();
  const c = /^[0-9a-f-]{36}$/.test(id) ? await getCategoryAdmin(id) : null;
  if (!c) notFound();
  const used = c.partners + c.leads + c.boosts;
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={c.name}
        subtitle={`${PARTNER_TYPE_LABEL[c.partnerType]} · indirizzo /${c.slug} · ${c.partners} aziende, ${c.leads} richieste`}
        back={{ href: "/admin/categorie", label: "Categorie" }}
      />

      <Panel title="Categoria">
        <div className="flex flex-col gap-4 p-5">
          <ActionForm action={updateCategoryAction.bind(null, c.id)} submit="Salva la categoria">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome" htmlFor="c-name" required>
                <Input id="c-name" name="name" defaultValue={c.name} required minLength={2} maxLength={60} />
              </Field>
              <Field label="Nome al plurale" htmlFor="c-plural" required>
                <Input id="c-plural" name="pluralName" defaultValue={c.pluralName} required minLength={2} maxLength={60} />
              </Field>
              <Field label="Icona" htmlFor="c-icon" required>
                <Select id="c-icon" name="icon" defaultValue={c.icon}>
                  {CATEGORY_ICONS.map((i) => (
                    <option key={i} value={i}>
                      {ICON_LABEL[i]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Ordine" htmlFor="c-order" help="Più basso = prima negli elenchi">
                <Input id="c-order" name="sortOrder" type="number" min={0} max={999} defaultValue={c.sortOrder} />
              </Field>
            </div>
          </ActionForm>
          {used === 0 ? (
            <DeleteForm action={deleteCategoryAction.bind(null, c.id)} label="Elimina la categoria" />
          ) : (
            <p className="text-caption text-ink-2">Non si può eliminare: la usano aziende, richieste o boost.</p>
          )}
        </div>
      </Panel>

      <Services c={c} />
      <Questions c={c} />
    </div>
  );
}

function UnitSelect({ id, value }: { id: string; value?: string }) {
  return (
    <Select id={id} name="defaultUnit" defaultValue={value ?? "flat"}>
      {PRICE_UNITS.map((u) => (
        <option key={u} value={u}>
          {PRICE_UNIT_LABEL[u]}
        </option>
      ))}
    </Select>
  );
}

function Services({ c }: { c: CategoryAdmin }) {
  return (
    <Panel title={`Servizi del listino (${c.services.length})`}>
      {c.services.length === 0 ? (
        <Empty>Nessun servizio: le aziende di questa categoria non possono ancora compilare il listino.</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {c.services.map((s) => (
            <li key={s.id} className="px-5 py-3 text-body-s">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-caption text-ink-2">
                    {PRICE_UNIT_LABEL[s.defaultUnit]} · in {s.priceLists} listini · {s.leads} richieste
                  </span>
                </summary>
                <div className="flex flex-col gap-3 pt-3">
                  <ActionForm action={updateServiceAction.bind(null, s.id)} submit="Salva il servizio">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Nome" htmlFor={`s-name-${s.id}`} required>
                        <Input id={`s-name-${s.id}`} name="name" defaultValue={s.name} required minLength={2} maxLength={80} />
                      </Field>
                      <Field label="Unità di prezzo proposta" htmlFor={`s-unit-${s.id}`} required>
                        <UnitSelect id={`s-unit-${s.id}`} value={s.defaultUnit} />
                      </Field>
                    </div>
                  </ActionForm>
                  {s.priceLists + s.leads === 0 && <DeleteForm action={deleteServiceAction.bind(null, s.id)} label="Elimina il servizio" />}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-line p-5">
        <ActionForm action={createServiceAction.bind(null, c.id)} submit="Aggiungi il servizio" reset>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nuovo servizio" htmlFor="s-new-name" required help="Es. «Installazione climatizzatore»">
              <Input id="s-new-name" name="name" required minLength={2} maxLength={80} />
            </Field>
            <Field label="Unità di prezzo proposta" htmlFor="s-new-unit" required>
              <UnitSelect id="s-new-unit" />
            </Field>
          </div>
        </ActionForm>
      </div>
    </Panel>
  );
}

function QuestionFields({ c, q, prefix }: { c: CategoryAdmin; q?: CategoryAdmin["questions"][number]; prefix: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Domanda" htmlFor={`${prefix}-label`} required>
        <Input id={`${prefix}-label`} name="label" defaultValue={q?.label} required minLength={2} maxLength={120} />
      </Field>
      <Field label="Tipo di risposta" htmlFor={`${prefix}-type`} required>
        <Select id={`${prefix}-type`} name="type" defaultValue={q?.type ?? "text"}>
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {QUESTION_TYPE_LABEL[t]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Aiuto sotto la domanda" htmlFor={`${prefix}-help`}>
        <Input id={`${prefix}-help`} name="help" defaultValue={q?.help ?? ""} maxLength={200} />
      </Field>
      <Field label="Vale per" htmlFor={`${prefix}-service`}>
        <Select id={`${prefix}-service`} name="serviceId" defaultValue={q?.serviceId ?? ""}>
          <option value="">Tutta la categoria</option>
          {c.services.map((s) => (
            <option key={s.id} value={s.id}>
              Solo «{s.name}»
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Opzioni" htmlFor={`${prefix}-options`} help="Solo per «Scelta da un elenco»: una per riga, almeno due">
        <Textarea id={`${prefix}-options`} name="options" rows={3} defaultValue={formatOptions(q?.options)} />
      </Field>
      <div className="flex flex-col gap-3">
        {q && (
          <Field label="Ordine" htmlFor={`${prefix}-order`}>
            <Input id={`${prefix}-order`} name="sortOrder" type="number" min={0} max={999} defaultValue={q.sortOrder} />
          </Field>
        )}
        <label className="inline-flex items-center gap-2 text-body-s">
          <input type="checkbox" name="required" defaultChecked={q?.required} className="size-4" /> Risposta obbligatoria
        </label>
      </div>
    </div>
  );
}

function Questions({ c }: { c: CategoryAdmin }) {
  const serviceName = new Map(c.services.map((s) => [s.id, s.name]));
  return (
    <Panel title={`Domande del modulo di richiesta (${c.questions.length})`}>
      <p className="border-b border-line px-5 py-3 text-caption text-ink-2">
        Il cliente le trova al passo «Dettagli». Le richieste già arrivate tengono domanda e risposta com&apos;erano: modificare o eliminare una domanda non le cambia.
      </p>
      {c.questions.length === 0 ? (
        <Empty>Nessuna domanda: il modulo chiede solo la descrizione libera.</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {c.questions.map((q) => (
            <li key={q.id} className="px-5 py-3 text-body-s">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {q.label}
                    {q.required && <span className="text-error"> *</span>}
                  </span>
                  <span className="text-caption text-ink-2">
                    {QUESTION_TYPE_LABEL[q.type]} · {q.serviceId ? `solo «${serviceName.get(q.serviceId) ?? "servizio"}»` : "tutta la categoria"}
                  </span>
                </summary>
                <div className="flex flex-col gap-3 pt-3">
                  <ActionForm action={updateQuestionAction.bind(null, q.id)} submit="Salva la domanda">
                    <QuestionFields c={c} q={q} prefix={`q-${q.id}`} />
                  </ActionForm>
                  <DeleteForm action={deleteQuestionAction.bind(null, q.id)} label="Elimina la domanda" />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-line p-5">
        <h3 className="mb-3 text-body font-semibold">Nuova domanda</h3>
        <ActionForm action={createQuestionAction.bind(null, c.id)} submit="Aggiungi la domanda" reset>
          <QuestionFields c={c} prefix="q-new" />
        </ActionForm>
      </div>
    </Panel>
  );
}
