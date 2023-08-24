import {MRBox, RBox, WBox, isRBox} from "@nartallax/cardboard"
import {ChildArray, Maybe, MaybeArray, TagDescription, UnboxedTuple, makeContainerTagFn, populateTag, resolveTagCreationArgs, watchAndRun} from "src/functions/base_tag"

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

type BoxableHTMLChild = string | number | boolean
type NonBoxableHTMLChild = HTMLElement | SVGElement
type NonboxedHTMLChild = NonBoxableHTMLChild | BoxableHTMLChild
export type HTMLChild = NonBoxableHTMLChild | MRBox<Maybe<BoxableHTMLChild>>
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

// this type is big and cumbersome, but it includes all the overloads I want
// I thought about converting it to function with tuple as parameters, which will make it much more palpable
// but that will lose parameter names, which is not acceptable
// general idea is -
// 1. description is first argument, is optional
// 2. there are two general forms:
// render element of the array (array box + getKey + renderChild)
// and render value of box or several (box or array of boxes + renderValue)
// 3. if array box is wbox - renderChild should get wbox as well; if not - rbox
type HTMLContainerTagFn =

(<const T extends readonly MRBox<unknown>[], N extends keyof HTMLElementTagNameMap = "div">(
	boxes: T, renderChild: (...args: UnboxedTuple<T>) => MaybeArray<NonboxedHTMLChild>
) => HTMLElementTagNameMap[N]) &

(<const T extends readonly MRBox<unknown>[], N extends keyof HTMLElementTagNameMap = "div">(
	description: HTMLTagDescription<N>, boxes: T, renderChild: (...args: UnboxedTuple<T>) => MaybeArray<NonboxedHTMLChild>
) => HTMLElementTagNameMap[N]) &

(<T, N extends keyof HTMLElementTagNameMap = "div">(
	box: MRBox<T>, renderChild: (item: T) => MaybeArray<NonboxedHTMLChild>
) => HTMLElementTagNameMap[N]) &

(<T, N extends keyof HTMLElementTagNameMap = "div">(
	description: HTMLTagDescription<N>, box: MRBox<T>, renderChild: (item: T) => MaybeArray<NonboxedHTMLChild>
) => HTMLElementTagNameMap[N]) &

(<T, K, N extends keyof HTMLElementTagNameMap = "div">(
	childItems: WBox<readonly T[]>, getKey: (item: T, index: number) => K, renderChild: (item: WBox<T>) => HTMLElement
) => HTMLElementTagNameMap[N]) &

(<T, K, N extends keyof HTMLElementTagNameMap = "div">(
	childItems: RBox<readonly T[]>, getKey: (item: T, index: number) => K, renderChild: (item: RBox<T>) => HTMLElement
) => HTMLElementTagNameMap[N]) &

(<T, K, N extends keyof HTMLElementTagNameMap = "div">(
	description: HTMLTagDescription<N>, childItems: WBox<readonly T[]>, getKey: (item: T, index: number) => K, renderChild: (item: WBox<T>) => HTMLElement
) => HTMLElementTagNameMap[N]) &

(<T, K, N extends keyof HTMLElementTagNameMap = "div">(
	description: HTMLTagDescription<N>, childItems: RBox<readonly T[]>, getKey: (item: T, index: number) => K, renderChild: (item: RBox<T>) => HTMLElement
) => HTMLElementTagNameMap[N])

/** Create an HTMLElement that contains children that are result of rendering of some boxed values */
export const containerTag: HTMLContainerTagFn = makeContainerTagFn(tag, renderHTMLChild) as any

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