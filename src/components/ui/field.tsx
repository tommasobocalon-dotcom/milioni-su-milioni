import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Componente "Campo testo" di Figma: etichetta, controllo, testo di aiuto o errore. */
export function Field({
  label,
  htmlFor,
  help,
  error,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  help?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-body-s font-semibold text-ink">
        {label}
        {required && <span className="text-error"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-caption text-error" role="alert">
          {error}
        </p>
      ) : help ? (
        <p id={`${htmlFor}-help`} className="text-caption text-ink-2">
          {help}
        </p>
      ) : null}
    </div>
  );
}

const control =
  "w-full rounded-md border border-line bg-surface px-3.5 text-body text-ink placeholder:text-ink-3 focus:border-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-primary aria-invalid:border-error";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "h-11 appearance-auto", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-28 py-3", className)} {...props} />;
}
