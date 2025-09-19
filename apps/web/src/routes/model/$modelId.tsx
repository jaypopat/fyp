import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/model/$modelId")({
  component: ModelDetailComponent,
});

function ModelDetailComponent() {
  const { modelId } = Route.useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-bold text-2xl">Model Details</h1>
      <p>Model ID: {modelId}</p>
    </div>
  );
}
