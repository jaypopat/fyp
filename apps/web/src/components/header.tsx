import { Link, useRouterState } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { config } from "@/config";
import { ModeToggle } from "./mode-toggle";

export default function Header() {
	const pathname = useRouterState({
		select: (state) => state.location?.pathname ?? "/",
	});
	const isHome = pathname === "/";
	const isDevPage = pathname === "/dev";

	return (
		<header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="flex h-14 w-full items-center justify-between px-4">
				<Link to="/" className="flex items-center gap-2 font-semibold text-sm">
					<span className="rounded-md bg-primary/5 px-2 py-1 text-primary">
						ZKFair
					</span>
					<span className="hidden text-muted-foreground sm:inline">
						AI Fairness Registry
					</span>
				</Link>
				<div className="flex items-center gap-2">
					{/* Contract on explorer (only when explorer is set, i.e., Sepolia in prod) */}
					{config.explorerBase && (
						<a
							href={`${config.explorerBase}/address/${config.contractAddress}`}
							target="_blank"
							rel="noreferrer"
							className="hidden text-muted-foreground text-xs underline-offset-4 hover:underline md:inline"
							title="View contract on explorer"
						>
							Contract ↗
						</a>
					)}
					{!isDevPage && ( // ✅ Add this condition
						<Button variant="ghost" size="icon" className="h-8 w-8" asChild>
							<Link to="/dev" title="Developer tools">
								<Wrench className="h-4 w-4" />
							</Link>
						</Button>
					)}
					{!isHome && (
						<Button variant="outline" size="sm" asChild>
							<Link to="/">Back to dashboard</Link>
						</Button>
					)}
					<ModeToggle />
				</div>
			</div>
		</header>
	);
}
