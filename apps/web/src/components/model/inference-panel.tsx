import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { AdultIncomeForm } from "@/components/adult-income-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isDemoMode } from "@/lib/demo";
import { predict } from "@/lib/inference";
import type { SDKModel } from "@/lib/sdk-types";

interface InferencePanelProps {
	model: SDKModel;
	modelId: string;
}

export function InferencePanel({ model, modelId }: InferencePanelProps) {
	const [inputCSV, setInputCSV] = useState("");
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<{
		prediction: number;
		seqNum: number;
	} | null>(null);
	const [showGuidedForm, setShowGuidedForm] = useState(true);

	// Check if this model has a guided form (by name)
	const hasGuidedForm =
		model?.name?.toLowerCase().includes("adult") ||
		model?.name?.toLowerCase().includes("income");

	const handlePredict = async (input: number[]) => {
		setLoading(true);
		setResult(null);
		try {
			const resultData = await predict({
				providerUrl: model.inferenceUrl,
				modelHash: modelId,
				input,
			});
			setResult({
				prediction: resultData.prediction,
				seqNum: resultData.receipt.seqNum,
			});
		} catch (err) {
			console.error(err);
			setResult(null);
		} finally {
			setLoading(false);
		}
	};

	const handleCSVSubmit = async () => {
		const values = inputCSV
			.split(",")
			.map((v) => v.trim())
			.filter((v) => v.length > 0)
			.map((v) => Number(v));

		if (!values.length || values.some((x) => Number.isNaN(x))) {
			throw new Error("Provide valid numeric input");
		}

		await handlePredict(values);
	};

	return (
		<Card className="flex flex-col">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="font-semibold text-base">
						Try Inference
					</CardTitle>
					{hasGuidedForm && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowGuidedForm(!showGuidedForm)}
							className="h-8 gap-1 text-xs"
						>
							{showGuidedForm ? (
								<>
									<ChevronUp className="h-3 w-3" />
									Simple
								</>
							) : (
								<>
									<ChevronDown className="h-3 w-3" />
									Guided
								</>
							)}
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col space-y-3">
				{hasGuidedForm && showGuidedForm ? (
					<>
						<AdultIncomeForm
							onSubmit={handlePredict}
							loading={loading}
							result={result}
						/>
						{result && isDemoMode() && (
							<Button asChild variant="outline" className="mt-2 w-full gap-2">
								<Link to="/demo">
									Continue Demo
									<ArrowRight className="h-4 w-4" />
								</Link>
							</Button>
						)}
					</>
				) : (
					<>
						<input
							className="w-full rounded border px-3 py-2 text-sm"
							placeholder="e.g. 39, 7, 77516, 9, ..."
							value={inputCSV}
							onChange={(e) => setInputCSV(e.target.value)}
						/>
						{result && (
							<div className="rounded bg-muted p-3 text-xs">
								<p>
									<span className="font-medium">Prediction:</span>{" "}
									<b>{result.prediction === 1 ? ">50K" : "≤50K"}</b>
								</p>
								<p>
									<span className="font-medium">Receipt:</span>{" "}
									<code className="text-xs">#{result.seqNum}</code>
								</p>
							</div>
						)}
						<div className="mt-auto space-y-2">
							<Button
								disabled={loading}
								className="w-full"
								size="sm"
								onClick={handleCSVSubmit}
							>
								{loading ? "Predicting…" : "Predict"}
							</Button>
							{result && isDemoMode() && (
								<Button
									asChild
									variant="outline"
									className="w-full gap-2"
									size="sm"
								>
									<Link to="/demo">
										Continue Demo
										<ArrowRight className="h-4 w-4" />
									</Link>
								</Button>
							)}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
