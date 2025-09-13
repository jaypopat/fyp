import { loader } from "fumadocs-core/source";
import * as icons from "lucide-static";
import { create, docs } from "../../source.generated";

export const source = loader({
	source: await create.sourceAsync(docs.doc, docs.meta),
	baseUrl: "/docs",
	icon(icon) {
		if (!icon) {
			return;
		}
		// Avoid dynamic access on a namespace import by copying to a plain object
		const iconMap = { ...icons } as Record<string, string>;
		if (icon in iconMap) return iconMap[icon];
	},
});
