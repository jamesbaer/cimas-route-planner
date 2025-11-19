import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  "data-valid"?: boolean | "true" | "false";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      {...props}
      className={cn(
        "input-surface h-9 w-full rounded-md px-3 text-sm",
        "bg-input text-foreground",
        "border border-border",
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary/40",
        "focus-visible:border-primary",
        "placeholder:text-muted-foreground",
        "dark:[color-scheme:dark]",
        className
      )}
    />
  )
)
Input.displayName = "Input"

export { Input }
