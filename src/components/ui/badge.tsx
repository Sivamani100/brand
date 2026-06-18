import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full px-2.5 text-xs font-semibold whitespace-nowrap transition-all [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-neutral-100 text-neutral-700",
        neutral: "bg-neutral-100 text-neutral-700",
        secondary: "bg-neutral-100 text-neutral-700",
        outline: "border border-neutral-200 text-neutral-700",
        success: "bg-success-bg text-success-text",
        danger: "bg-danger-bg text-danger-text",
        destructive: "bg-danger-bg text-danger-text",
        ghost: "bg-transparent text-neutral-700 hover:bg-neutral-100",
        link: "text-orange-500 underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
