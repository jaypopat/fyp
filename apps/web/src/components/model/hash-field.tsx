import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function formatHash(value?: string, fallback = "—") {
	if (!value) return fallback;
	return value.length > 20 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
}

type HashFieldProps = {
	label: string;
	value?: string;
	copied: boolean;
	onCopy?: (value: string) => void;
	fallback?: string;
	href?: string;
};

export function HashField({
	label,
	value,
	copied,
	onCopy,
	fallback = "—",
	href,
}: HashFieldProps) {
	return (
		<div className="space-y-1">
			<p className="text-muted-foreground text-sm">{label}</p>
			<div className="flex items-center gap-2">
				{href && value ? (
					<a
						href={href}
						target="_blank"
						rel="noreferrer"
						className="underline-offset-4 hover:underline"
						title={`Open ${label} on explorer`}
					>
						<code
							title={value}
							className="break-all rounded bg-muted px-2 py-1 text-xs md:text-sm"
						>
							{formatHash(value, fallback)}
						</code>
					</a>
				) : (
					<code
						title={value}
						className="break-all rounded bg-muted px-2 py-1 text-xs md:text-sm"
					>
						{formatHash(value, fallback)}
					</code>
				)}
				{value && onCopy ? (
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={() => onCopy(value)}
						aria-label={`Copy ${label}`}
					>
						{copied ? (
							<Check className="h-4 w-4" />
						) : (
							<Copy className="h-4 w-4" />
						)}
					</Button>
				) : null}
			</div>
		</div>
	);
}

type LifecycleRowProps = {
	label: string;
	value: string;
	muted?: boolean;
};

export function LifecycleRow({
	label,
	value,
	muted = false,
}: LifecycleRowProps) {
	return (
		<div className="space-y-1">
			<p className="text-muted-foreground text-sm">{label}</p>
			<p
				className={`${muted ? "text-muted-foreground" : "text-foreground"} text-sm`}
			>
				{value}
			</p>
		</div>
	);
}
