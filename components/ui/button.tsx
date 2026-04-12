import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#173F74] text-white hover:bg-[#204E8C] focus-visible:ring-[#56B6DE]",
        outline:
          "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 focus-visible:ring-[#56B6DE]",
        secondary:
          "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-[#56B6DE]",
        ghost:
          "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-[#56B6DE]",
        members:
          "bg-[#56B6DE] text-white hover:bg-[#46C2D8] focus-visible:ring-[#56B6DE]",
        messages:
          "bg-[#9A6FC0] text-white hover:bg-[#8B63B1] focus-visible:ring-[#9A6FC0]",
        market:
          "bg-[#F39A3D] text-white hover:bg-[#E58E34] focus-visible:ring-[#F39A3D]",
        fund:
          "bg-[#F6BC3E] text-[#173F74] hover:bg-[#EAB334] focus-visible:ring-[#F6BC3E]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }
