import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { createServerFn } from "@tanstack/react-start";
import { source } from "@/lib/source";
import type { PageTree } from "fumadocs-core/server";
import { useMemo } from "react";
import { docs } from "../../source.generated";
import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle,
} from "fumadocs-ui/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { createClientLoader } from "fumadocs-mdx/runtime/vite";
import { baseOptions } from "@/lib/layout.shared";

export const Route = createFileRoute("/")({
	component: HomePage,
	loader: async () => {
		// Load the index/home page of docs
		const data = await loader({ data: [] }); // Empty array for root
		await clientLoader.preload(data.path);
		return data;
	},
});

const loader = createServerFn({
	method: "GET",
})
	.validator((slugs: string[]) => slugs)
	.handler(async ({ data: slugs }) => {
		// Get the index page (root docs page)
		const page = source.getPage(slugs.length === 0 ? [] : slugs);
		if (!page) {
			// Fallback to first available page or create a default
			const firstPage = source.getPages()[0];
			if (!firstPage) throw new Error("No documentation pages found");
			return {
				tree: source.pageTree as object,
				path: firstPage.path,
			};
		}
		return {
			tree: source.pageTree as object,
			path: page.path,
		};
	});

const clientLoader = createClientLoader(docs.doc, {
	id: "docs",
	component({ toc, frontmatter, default: MDX }) {
		return (
			<DocsPage toc={toc}>
				<DocsTitle>
					{frontmatter.title || "ZK AI Fairness Auditing Documentation"}
				</DocsTitle>
				<DocsDescription>
					{frontmatter.description ||
						"Complete documentation for our zero-knowledge AI fairness auditing system."}
				</DocsDescription>
				<DocsBody>
					<MDX
						components={{
							...defaultMdxComponents,
						}}
					/>
				</DocsBody>
			</DocsPage>
		);
	},
});

function HomePage() {
	const data = Route.useLoaderData();
	const Content = clientLoader.getComponent(data.path);
	const tree = useMemo(
		() => transformPageTree(data.tree as PageTree.Folder),
		[data.tree],
	);

	return (
		<DocsLayout {...baseOptions()} tree={tree}>
			<Content />
		</DocsLayout>
	);
}

function transformPageTree(tree: PageTree.Folder): PageTree.Folder {
	function SvgIcon({ __html }: { __html: string }) {
		// biome-ignore lint/security/noDangerouslySetInnerHtml: SVG icons are generated at build-time by Fumadocs and are safe
		return <span dangerouslySetInnerHTML={{ __html }} />;
	}

	function transform<T extends PageTree.Item | PageTree.Separator>(item: T) {
		if (typeof item.icon !== "string") return item;
		return {
			...item,
			icon: <SvgIcon __html={item.icon} />,
		};
	}

	return {
		...tree,
		index: tree.index ? transform(tree.index) : undefined,
		children: tree.children.map((item) => {
			if (item.type === "folder") return transformPageTree(item);
			return transform(item);
		}),
	};
}
