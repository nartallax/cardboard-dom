import {MRBox, RBox, WBox, isRBox} from "@nartallax/cardboard"
import {ChildArray, Maybe, TagDescription, bindChildArrayToTag, populateTag, resolveContainerTagCreationArgs, resolveTagCreationArgs, watchAndRun} from "src/functions/base_tag"

type IfEquals<X, Y, A, B> =
    (<T>() => T extends X ? 1 : 2) extends
    (<T>() => T extends Y ? 1 : 2) ? A : B
type WritableKeysOf<T> = {
	[P in keyof T]: IfEquals<{[Q in P]: T[P]}, {-readonly [Q in P]: T[P]}, P, never>
}[keyof T]
type WritablePart<T> = Pick<T, WritableKeysOf<T>>
type WritableStyles = WritablePart<CSSStyleDeclaration>

type IsAnyString<X, IfTrue, IfFalse> = string extends X ? IfTrue : IfFalse
type StyleValue<K extends keyof WritableStyles> = IsAnyString<CSSStyleDeclaration[K], string | number, CSSStyleDeclaration[K]> | null | undefined
type StyleValues = {
	readonly [k in keyof WritableStyles]?: MRBox<StyleValue<k>>
}

interface HTMLTagDescriptionBase {
	readonly style?: StyleValues
}

export interface HTMLTagDescription<K extends keyof HTMLElementTagNameMap = keyof HTMLElementTagNameMap> extends HTMLTagDescriptionBase, TagDescription<K, HTMLElementTagNameMap[K]>{}

type HTMLChild = HTMLElement | SVGElement | MRBox<Maybe<string | number | boolean>>
export type HTMLChildArray = ChildArray<HTMLChild>

/** Create an HTMLElement according to the description. */
export function tag(): HTMLDivElement
export function tag<K extends keyof HTMLElementTagNameMap = "div">(description: HTMLTagDescription<K>): HTMLElementTagNameMap[K]
export function tag(children: HTMLChildArray): HTMLDivElement
export function tag<K extends keyof HTMLElementTagNameMap = "div">(description: HTMLTagDescription<K>, children: HTMLChildArray): HTMLElementTagNameMap[K]
export function tag<K extends keyof HTMLElementTagNameMap = "div">(a?: HTMLTagDescription<K> | HTMLChildArray, b?: HTMLChildArray): HTMLElementTagNameMap[K] {
	const [description, children] = resolveTagCreationArgs(a, b)

	const tagBase = document.createElement(description.tag || "div")

	let binder = populateTag(tagBase, description, children, renderHTMLChild)

	if(description.style){
		for(const k in description.style){
			const styleValue = description.style[k]
			binder = watchAndRun(binder, tagBase, styleValue, v => {
				if(v === undefined || v === null){
					tagBase.style.removeProperty(k)
				} else {
					tagBase.style[k] = v as string // ew
				}
			})
		}
	}

	return tagBase as HTMLElementTagNameMap[K]
}


function getHtmlChildContent(content: string | number | boolean | null | undefined): string | null {
	if(content === null || content === undefined || content === true || content === false){
		return null
	} else {
		return content + ""
	}

}

/** Create an HTMLElement that contains children that are result of rendering of individual items of an array */
export function containerTag<T, K, N extends keyof HTMLElementTagNameMap = "div">(childItems: WBox<readonly T[]>, getKey: (item: T, index: number) => K, renderChild: (item: WBox<T>) => HTMLElement): HTMLElementTagNameMap[N]
export function containerTag<T, K, N extends keyof HTMLElementTagNameMap = "div">(childItems: RBox<readonly T[]>, getKey: (item: T, index: number) => K, renderChild: (item: RBox<T>) => HTMLElement): HTMLElementTagNameMap[N]
export function containerTag<T, K, N extends keyof HTMLElementTagNameMap = "div">(description: HTMLTagDescription<N>, childItems: WBox<readonly T[]>, getKey: (item: T, index: number) => K, renderChild: (item: WBox<T>) => HTMLElement): HTMLElementTagNameMap[N]
export function containerTag<T, K, N extends keyof HTMLElementTagNameMap = "div">(description: HTMLTagDescription<N>, childItems: RBox<readonly T[]>, getKey: (item: T, index: number) => K, renderChild: (item: RBox<T>) => HTMLElement): HTMLElementTagNameMap[N]
export function containerTag(a: any, b: any, c: any, d?: any): HTMLElement {
	const [description, childItems, getKey, renderChild] = resolveContainerTagCreationArgs<HTMLTagDescription>(a, b, c, d)
	const result = tag(description)
	bindChildArrayToTag(result, childItems, getKey, renderChild)
	return result
}

function renderHTMLChild(child: Exclude<HTMLChild, Node>): Node | null {
	if(isRBox(child)){
		const node = document.createTextNode("")
		watchAndRun(null, node, child, value => {
			node.textContent = getHtmlChildContent(value) ?? ""
		})
		return node
	}
	const content = getHtmlChildContent(child)
	if(content === null){
		return null
	}
	return document.createTextNode(content)
}