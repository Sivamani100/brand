import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-lg text-sm font-semibold whitespace-nowrap outline-none select-none transition-[background-color,border-color,transform,box-shadow] duration-150 ease-in-out active:duration-100 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary — filled dark
        default:
          "bg-neutral-850 text-white hover:bg-[#232228] active:bg-[#0E0D10] active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300 focus-visible:outline-offset-2 disabled:bg-neutral-200 disabled:text-neutral-400",
        // Primary — filled brand
        brand:
          "bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-200 focus-visible:outline-offset-2 disabled:bg-orange-100 disabled:text-white/60",
        // Secondary — outline
        outline:
          "bg-neutral-50 border border-neutral-200 text-neutral-900 hover:bg-neutral-100 hover:border-[#D9D9D9] active:bg-[#EFEFEF] active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300 focus-visible:outline-offset-2 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:border-neutral-100",
        // Ghost / Text
        ghost:
          "bg-transparent text-orange-500 hover:text-orange-600 active:text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-200 disabled:text-neutral-400",
        // Destructive
        destructive:
          "bg-danger-bg text-danger-text hover:bg-danger-bg/85 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger-text/40 disabled:bg-neutral-100 disabled:text-neutral-400",
        link: "text-orange-500 underline-offset-4 hover:underline",
      },
      size: {
        // sm: height 32px, padding 12px, font 13px, icon size 14px, gap 6px
        sm: "h-8 px-3 text-[13px] gap-[6px] rounded-lg [&_svg]:size-[14px]",
        // md / default: height 40px, padding 16px, font 14px, icon size 16px, gap 8px
        default: "h-10 px-4 text-sm gap-2 rounded-lg [&_svg]:size-4",
        md: "h-10 px-4 text-sm gap-2 rounded-lg [&_svg]:size-4",
        // lg: height 44px, padding 20px, font 14px, icon size 18px, gap 8px
        lg: "h-11 px-5 text-sm gap-2 rounded-lg [&_svg]:size-[18px]",
        // icon: square 40x40px, icon 20px centered
        icon: "size-10 p-0 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 active:bg-neutral-200 active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300 focus-visible:outline-offset-2 [&_svg]:size-5",
        "icon-sm": "size-8 p-0 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 active:scale-[0.96] [&_svg]:size-[14px]",
        "icon-lg": "size-11 p-0 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 active:scale-[0.96] [&_svg]:size-6",
        xs: "h-6 px-2 text-[11px] gap-1 rounded-md [&_svg]:size-3",
        "icon-xs": "size-6 p-0 rounded-md [&_svg]:size-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
