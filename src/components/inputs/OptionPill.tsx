import * as React from "react"
import { cn } from "../../lib/utils"

export function OptionPill({ selected, children, ...props }:{
  selected: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      type="button"
      className={cn(
        "h-9 px-3 text-sm rounded-md transition-colors select-none",
        "border border-border hover:border-foreground/40",
        selected && "border-2 border-primary ring-1 ring-primary/30",
        props.className
      )}
      aria-pressed={selected}
      data-selected={selected ? "true" : "false"}
    >
      {children}
    </button>
  );
}
