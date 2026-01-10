"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Switch({
	className,
	...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
	return (
		<SwitchPrimitive.Root
			className={cn(
				"group relative inline-flex h-10 w-20 shrink-0 cursor-pointer items-center rounded-base border-2 border-border bg-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-main",
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				className={cn(
					"pointer-events-none block h-6 w-6 rounded-base border-2 border-border bg-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform data-[state=checked]:translate-x-[42px] data-[state=unchecked]:translate-x-[4px] data-[state=checked]:bg-background",
				)}
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
