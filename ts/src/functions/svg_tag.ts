import {RBox, WBox} from "@nartallax/cardboard"
import {ChildArray, TagDescription, makeContainerTagFn, populateTag, resolveTagCreationArgs} from "src/functions/base_tag"

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

type ContainerSvgTagFn =
(<T, K, N extends keyof SVGElementTagNameMap = "g">(
	childItems: RBox<readonly T[]>, getKey: (item: T, index: number) => K, renderChild: (item: RBox<T>) => SVGElement
) => SVGElementTagNameMap[N]) &

(<T, K, N extends keyof SVGElementTagNameMap = "g">(
	childItems: WBox<readonly T[]>, getKey: (item: T, index: number) => K, renderChild: (item: WBox<T>) => SVGElement
) => SVGElementTagNameMap[N]) &

(<T, K, N extends keyof SVGElementTagNameMap = "g">(
	description: SVGTagDescription<N>, childItems: RBox<readonly T[]>, getKey: (item: T, index: number) => K, renderChild: (item: RBox<T>) => SVGElement
) => SVGElementTagNameMap[N]) &

(<T, K, N extends keyof SVGElementTagNameMap = "g">(
	description: SVGTagDescription<N>, childItems: WBox<readonly T[]>, getKey: (item: T, index: number) => K, renderChild: (item: WBox<T>) => SVGElement
) => SVGElementTagNameMap[N])

/** Create an SVGElement that contains children that are result of rendering of individual items of an array */
export const containerSvgTag: ContainerSvgTagFn = makeContainerTagFn(svgTag) as any