import {MRBox} from "@nartallax/cardboard"
import {ChildArray, TagDescription, populateTag, resolveTagCreationArgs, watchAndRun} from "src/functions/base_tag"

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

type HTMLChild = HTMLElement | SVGElement
export type HTMLChildArray = ChildArray<HTMLChild>

/** Create an HTMLElement according to the description. */
export function tag(): HTMLDivElement
export function tag<K extends keyof HTMLElementTagNameMap = "div">(description: HTMLTagDescription<K>): HTMLElementTagNameMap[K]
export function tag(children: HTMLChildArray): HTMLDivElement
export function tag<K extends keyof HTMLElementTagNameMap = "div">(description: HTMLTagDescription<K>, children: HTMLChildArray): HTMLElementTagNameMap[K]
export function tag<K extends keyof HTMLElementTagNameMap = "div">(a?: HTMLTagDescription<K> | HTMLChildArray, b?: HTMLChildArray): HTMLElementTagNameMap[K] {
	const [description, children] = resolveTagCreationArgs(a, b)

	const tagBase = document.createElement(description.tag || "div")

	let binder = populateTag(tagBase, description, children)

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