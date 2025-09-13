import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Shield } from "lucide-react";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	return (
		<div className="container mx-auto max-w-3xl px-4 py-12">
			<div className="mb-12 text-center">
				<h1 className="mb-4 font-bold text-3xl text-foreground">
					ZK AI Fairness Auditing
				</h1>
				<p className="text-muted-foreground">Choose your role to get started</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<Link
					to="/"
					className="group rounded-lg border border-border bg-card p-8 transition-all hover:border-blue-500/50 hover:bg-accent"
				>
					<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 transition-colors group-hover:bg-blue-500/20">
						<Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
					</div>

					<h2 className="mb-3 font-semibold text-card-foreground text-xl">
						AI Company
					</h2>

					<p className="mb-4 text-muted-foreground">
						Generate fairness proofs for your ML models
					</p>

					<div className="flex items-center font-medium text-blue-600 transition-all group-hover:gap-2 dark:text-blue-400">
						Get Started
						<ArrowRight className="ml-1 h-4 w-4" />
					</div>
				</Link>

				<Link
					to="/"
					className="group rounded-lg border border-border bg-card p-8 transition-all hover:border-purple-500/50 hover:bg-accent"
				>
					<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-purple-500/20 bg-purple-500/10 transition-colors group-hover:bg-purple-500/20">
						<Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
					</div>

					<h2 className="mb-3 font-semibold text-card-foreground text-xl">
						Regulator
					</h2>

					<p className="mb-4 text-muted-foreground">
						Audit and verify AI fairness claims
					</p>

					<div className="flex items-center font-medium text-purple-600 transition-all group-hover:gap-2 dark:text-purple-400">
						Get Started
						<ArrowRight className="ml-1 h-4 w-4" />
					</div>
				</Link>
			</div>
		</div>
	);
}
