import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Componente "Button" di Figma: varianti Primario / Secondario / Ghost / Chiaro, taglie M e S. */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-brand hover:bg-primary-hover",
        secondary: "border border-primary bg-surface text-primary hover:bg-subtle",
        ghost: "text-primary hover:bg-subtle",
        light: "bg-surface text-brand hover:bg-crema-100",
        danger: "border border-error bg-surface text-error hover:bg-error-soft",
      },
      size: {
        m: "h-11 px-5 text-body",
        s: "h-9 px-4 text-body-s",
      },
    },
    defaultVariants: { variant: "primary", size: "m" },
  },
);

type Variants = VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ComponentProps<"button"> & Variants) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function ButtonLink({ className, variant, size, ...props }: ComponentProps<typeof Link> & Variants) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
