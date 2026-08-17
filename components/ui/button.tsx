import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-[#00E5FF] dark:text-black dark:hover:bg-[#00D0EB]",
        destructive: "bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-950 dark:text-rose-400 dark:hover:bg-rose-900",
        outline: "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-white dark:hover:bg-[#252525]",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
        ghost: "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100",
        link: "text-indigo-600 underline-offset-4 hover:underline dark:text-[#00E5FF]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8 text-base",
        icon: "h-9 w-9 p-0",
        "icon-sm": "h-7 w-7 p-0",
        "icon-lg": "h-10 w-10 p-0",
        xs: "h-6 px-2 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => {
    return (
      <button
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
