import { Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyButtonProps {
	copied: boolean;
	onCopy: () => void;
	size?: "sm" | "default" | "lg" | "icon";
}

export function CopyButton({ copied, onCopy, size = "icon" }: CopyButtonProps) {
	return (
		<Button variant="ghost" size={size} onClick={onCopy} className="h-8 w-8">
			{copied ? (
				<Check className="h-4 w-4 text-green-500" />
			) : (
				<Copy className="h-4 w-4" />
			)}
		</Button>
	);
}

interface LoadingButtonProps {
	loading: boolean;
	loadingText?: string;
	children: React.ReactNode;
	onClick?: () => void;
	disabled?: boolean;
	variant?: "default" | "outline" | "secondary" | "destructive" | "ghost";
	className?: string;
}

export function LoadingButton({
	loading,
	loadingText = "Loading...",
	children,
	onClick,
	disabled,
	variant = "default",
	className,
}: LoadingButtonProps) {
	return (
		<Button
			variant={variant}
			onClick={onClick}
			disabled={disabled || loading}
			className={className}
		>
			{loading ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					{loadingText}
				</>
			) : (
				children
			)}
		</Button>
	);
}

interface TransactionButtonProps {
	isPending: boolean;
	isConfirming: boolean;
	isSuccess: boolean;
	onClick: () => void;
	disabled?: boolean;
	pendingText?: string;
	confirmingText?: string;
	successText?: string;
	children: React.ReactNode;
	variant?: "default" | "outline" | "secondary" | "destructive" | "ghost";
	className?: string;
}

export function TransactionButton({
	isPending,
	isConfirming,
	isSuccess,
	onClick,
	disabled,
	pendingText = "Confirm in Wallet...",
	confirmingText = "Confirming...",
	successText = "Success",
	children,
	variant = "default",
	className,
}: TransactionButtonProps) {
	const isLoading = isPending || isConfirming;

	return (
		<Button
			variant={variant}
			onClick={onClick}
			disabled={disabled || isLoading || isSuccess}
			className={className}
		>
			{isPending ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					{pendingText}
				</>
			) : isConfirming ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					{confirmingText}
				</>
			) : isSuccess ? (
				<>
					<Check className="mr-2 h-4 w-4" />
					{successText}
				</>
			) : (
				children
			)}
		</Button>
	);
}
