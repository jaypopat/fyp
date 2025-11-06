import { cva, type VariantProps } from "class-variance-authority";
import { Slot as SlotPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

const BASE_BUTTON_CLASSES =
	"inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-base)] border-2 border-border font-medium text-sm outline-none transition-shadow focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 shadow-[var(--shadow)] hover:shadow-none active:translate-y-px active:shadow-none";

const LINK_BUTTON_CLASSES =
	"text-main underline-offset-4 hover:underline border-0 shadow-none hover:translate-x-0 hover:translate-y-0";

const buttonVariants = cva(BASE_BUTTON_CLASSES, {
	variants: {
		variant: {
			default: "bg-main text-main-foreground",
			destructive: "bg-chart-2 text-white",
			outline: "bg-secondary-background text-foreground",
			secondary: "bg-background text-foreground",
			ghost: "bg-transparent text-foreground hover:bg-main/10",
			plain:
				"border-0 bg-transparent text-foreground shadow-none hover:bg-transparent",
			link: LINK_BUTTON_CLASSES,
		},
		size: {
			default: "h-9 px-4 py-2 has-[>svg]:px-3",
			sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
			lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
			icon: "size-9",
		},
	},
	defaultVariants: {
		variant: "default",
		size: "default",
	},
});

const Button = React.forwardRef<
	HTMLButtonElement,
	React.ComponentProps<"button"> &
		VariantProps<typeof buttonVariants> & {
			asChild?: boolean;
		}
>(({ className, variant, size, asChild = false, ...props }, ref) => {
	const Comp = asChild ? SlotPrimitive.Slot : "button";

	return (
		<Comp
			ref={ref}
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
});

Button.displayName = "Button";

export { Button, buttonVariants };
