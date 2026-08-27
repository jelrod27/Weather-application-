/**
 * Shared className merge and JSON-LD serialization.
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** Serialize an object for safe embedding inside <script type="application/ld+json">. */
export function safeJsonLd(obj: unknown): string {
  // Escape `<`/`>` to neutralize `</script>`/`<!--` breakouts, and the U+2028/
  // U+2029 line separators which are valid JSON but break JS string literals if
  // this output is ever consumed by an executable inline <script>.
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
