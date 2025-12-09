import { Link, useRouterState } from "@tanstack/react-router";
import { History, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { config } from "@/config";
import { ModeToggle } from "./mode-toggle";
import { WalletConnect } from "./wallet-connect";

const HEADER_CLASSES =
	"border-b-2 border-border bg-secondary-background shadow-[var(--shadow)]";

export default function Header() {
	const pathname = useRouterState({
		select: (state) => state.location?.pathname ?? "/",
	});
	const isHome = pathname === "/";
	const isDevPage = pathname === "/dev";
	const isReceipts = pathname === "/receipts";

	return (
		<header className={HEADER_CLASSES}>
			<div className="flex h-14 w-full items-center justify-between px-4">
				<div className="flex items-center gap-4">
					<Link
						to="/"
						className="flex items-center gap-3 font-semibold text-sm"
						aria-label="ZKFair home"
					>
						<span className="rounded-[var(--radius-base)] border-2 border-border bg-main/10 px-2 py-1 text-main shadow-[var(--shadow)]">
							ZKFair
						</span>
					</Link>

					<a
						href={`${config.explorerBase}/address/${config.contractAddress}`}
						target="_blank"
						rel="noreferrer"
						className="hidden text-foreground/70 text-xs underline-offset-4 hover:underline md:inline"
						title="View contract on explorer"
					>
						Contract ↗
					</a>
				</div>

				<div className="flex items-center gap-2">
					{!isReceipts && (
						<Button variant="ghost" size="icon" className="h-8 w-8" asChild>
							<Link to="/receipts" title="My Receipts">
								<History className="h-4 w-4" />
							</Link>
						</Button>
					)}
					{!isDevPage && (
						<Button variant="ghost" size="icon" className="h-8 w-8" asChild>
							<Link to="/dev" title="Developer tools">
								<Wrench className="h-4 w-4" />
							</Link>
						</Button>
					)}
					{!isHome && (
						<Button variant="outline" size="sm" asChild>
							<Link to="/">Dashboard</Link>
						</Button>
					)}
					<WalletConnect />
					<ModeToggle />
				</div>
			</div>
		</header>
	);
}
