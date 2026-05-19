import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border select-none transition-all duration-200",
  {
    variants: {
      variant: {
        active:
          "bg-emerald-50 text-emerald-600 border-emerald-200",
        inactive:
          "bg-rose-50 text-rose-600 border-rose-200",
        pending:
          "bg-amber-50 text-amber-600 border-amber-200",
        info:
          "bg-sky-50 text-sky-600 border-sky-200",
        default:
          "bg-slate-100 text-slate-600 border-slate-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/**
 * StatusBadge — A reusable status/tag badge for tables.
 *
 * @param {string} text — The label to display
 * @param {"active"|"inactive"|"pending"|"info"|"default"} variant — Preset color variant
 * @param {string} bgColor — Custom background color (overrides variant)
 * @param {string} textColor — Custom text color (overrides variant)
 * @param {string} borderColor — Custom border color (overrides variant)
 * @param {React.ReactNode} icon — Optional icon to render before the text
 * @param {string} className — Additional class names
 *
 * Usage:
 *   <StatusBadge text="Active" variant="active" />
 *   <StatusBadge text="Blocked" variant="inactive" />
 *   <StatusBadge text="Custom" bgColor="#FEF3C7" textColor="#92400E" borderColor="#F59E0B" />
 */
const StatusBadge = React.forwardRef(
  (
    {
      text,
      variant,
      bgColor,
      textColor,
      borderColor,
      icon,
      className,
      ...props
    },
    ref,
  ) => {
    // If custom colors are provided, use inline styles (backwards-compatible with old Tabletag)
    const hasCustomColors = bgColor || textColor || borderColor;

    return (
      <span
        ref={ref}
        className={cn(
          statusBadgeVariants({ variant: hasCustomColors ? undefined : variant }),
          className,
        )}
        style={
          hasCustomColors
            ? {
                backgroundColor: bgColor,
                color: textColor,
                borderColor: borderColor,
                borderWidth: "1px",
                borderStyle: "solid",
              }
            : undefined
        }
        {...props}
      >
        {icon && <span className="flex items-center shrink-0">{icon}</span>}
        {text}
      </span>
    );
  },
);

StatusBadge.displayName = "StatusBadge";

export { StatusBadge, statusBadgeVariants };
