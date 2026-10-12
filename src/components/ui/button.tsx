import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { LoaderCircle } from "lucide-react";
const buttonVariants = cva(
  "inline-flex min-h-11 min-w-11 max-w-full items-center justify-center gap-2 rounded-[10px] px-[18px] py-2.5 text-sm font-bold leading-snug whitespace-normal break-words transition-[background-color,border-color,color,opacity,transform] duration-[160ms] ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-40 disabled:transform-none",
  {
    variants: {
      variant: {
        default: "bg-accent text-on-accent hover:bg-accent-hover",
        secondary:
          "border-[1.5px] border-accent bg-surface text-accent-text hover:bg-accent-soft active:bg-accent-soft",
        ghost:
          "text-text-muted hover:bg-surface-3 hover:text-text active:bg-surface-3",
        destructive: "text-danger hover:bg-danger-soft active:bg-danger-soft",
        "destructive-confirm":
          "bg-danger text-on-accent hover:opacity-90 active:opacity-80",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
export function Button({
  className,
  variant,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && (
            <LoaderCircle
              size={16}
              className="shrink-0 animate-spin"
              aria-hidden="true"
            />
          )}
          {children}
        </>
      )}
    </Comp>
  );
}
