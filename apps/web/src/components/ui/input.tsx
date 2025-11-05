import type * as React from "react";

import { cn } from "@/lib/utils";

const INPUT_CLASSES =
	"flex h-9 w-full min-w-0 rounded-[var(--radius-base)] border-2 border-border bg-secondary-background px-3 py-1 text-base outline-none transition-[color,box-shadow] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-foreground/60 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm shadow-[var(--shadow)]";
const INPUT_FOCUS_CLASSES = "focus-visible:border-main focus-visible:ring-0";
const INPUT_INVALID_CLASSES = "aria-invalid:border-chart-2";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				INPUT_CLASSES,
				INPUT_FOCUS_CLASSES,
				INPUT_INVALID_CLASSES,
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
