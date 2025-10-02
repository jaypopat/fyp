import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./mode-toggle";

export default function Header() {
	const pathname = useRouterState({
		select: (state) => state.location?.pathname ?? "/",
	});
	const isHome = pathname === "/";

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
