import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const optBtn = (on: boolean, success: boolean = false) =>
  cn(
    "border border-input px-3 h-10 rounded-md transition-colors",
    on && !success && "border-2 border-primary bg-accent font-semibold",  // thicker primary border + bold when selected
    success && "border-green-500 bg-green-50 font-semibold"  // green success styling
  );
