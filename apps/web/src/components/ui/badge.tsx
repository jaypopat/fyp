import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const BADGE_BASE_CLASSES =
	"inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-[var(--radius-base)] border-2 border-border bg-secondary-background px-2 py-0.5 font-medium text-xs transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3 shadow-[var(--shadow)]";

const badgeVariants = cva(BADGE_BASE_CLASSES, {
	variants: {
		variant: {
			default: "bg-main text-main-foreground",
			secondary: "bg-background text-foreground",
			destructive: "bg-chart-2 text-white",
			outline: "bg-secondary-background text-foreground",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

function Badge({
	className,
	variant,
	asChild = false,
	...props
}: React.ComponentProps<"span"> &
	VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot : "span";

	return (
		<Comp
			data-slot="badge"
			className={cn(badgeVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { Badge, badgeVariants };
