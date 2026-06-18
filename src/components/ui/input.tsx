import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-all duration-150 ease-in-out",
        "hover:border-[#D9D9D9]",
        "focus:border-orange-500 focus:ring-3 focus:ring-orange-100",
        "disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed",
        "aria-invalid:border-danger-text aria-invalid:ring-3 aria-invalid:ring-danger-bg",
        className
      )}
      {...props}
    />
  )
}

export { Input }
