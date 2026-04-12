import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#173F74] text-white",
        secondary: "bg-slate-100 text-slate-900",
        outline: "border border-slate-200 text-slate-700",
        members: "border border-[#56B6DE]/30 bg-[#56B6DE]/12 text-[#173F74]",
        messages: "border border-[#9A6FC0]/30 bg-[#9A6FC0]/12 text-[#173F74]",
        market: "border border-[#F39A3D]/30 bg-[#F39A3D]/12 text-[#173F74]",
        fund: "border border-[#F6BC3E]/35 bg-[#F6BC3E]/14 text-[#173F74]",
        soft: "border border-slate-200 bg-white text-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
