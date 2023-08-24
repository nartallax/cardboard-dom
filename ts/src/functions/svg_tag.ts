import {ChildArray, TagDescription, populateTag, resolveTagCreationArgs} from "src/functions/base_tag"

export type SVGTagDescription<K extends keyof SVGElementTagNameMap = keyof SVGElementTagNameMap> = TagDescription<K, SVGElementTagNameMap[K]>

export type SVGChildArray = ChildArray<SVGElement>

/** Create an SVGElement according to the description. */
export function svgTag(): SVGGElement
export function svgTag<K extends keyof SVGElementTagNameMap = "g">(description: SVGTagDescription<K>): SVGElementTagNameMap[K]
export function svgTag(children: SVGChildArray): SVGGElement
export function svgTag<K extends keyof SVGElementTagNameMap = "g">(description: SVGTagDescription<K>, children: SVGChildArray): SVGElementTagNameMap[K]

export function svgTag<K extends keyof SVGElementTagNameMap = "g">(a?: SVGTagDescription<K> | SVGChildArray, b?: SVGChildArray): SVGElementTagNameMap[K] {
	const [description, children] = resolveTagCreationArgs(a, b)

	const tagBase = document.createElementNS("http://www.w3.org/2000/svg", description.tag || "g")

	if(description.tag === "svg"){
		tagBase.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink")
	}

	populateTag(tagBase, description, children)

	return tagBase as SVGElementTagNameMap[K]
}