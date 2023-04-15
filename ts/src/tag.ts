import {Binder, getBinder} from "src/binder"
import {isConstBox, isRBox, MRBox, unbox} from "@nartallax/cardboard"
import {ClassNameParts, makeClassname} from "src/classname"

type IfEquals<X, Y, A, B> =
    (<T>() => T extends X ? 1 : 2) extends
    (<T>() => T extends Y ? 1 : 2) ? A : B

type WritableKeysOf<T> = {
	[P in keyof T]: IfEquals<{[Q in P]: T[P]}, {-readonly [Q in P]: T[P]}, P, never>
}[keyof T]
type WritablePart<T> = Pick<T, WritableKeysOf<T>>
type WritableStyles = WritablePart<CSSStyleDeclaration>

type NoLeadingOn<T extends `on${string}`> = T extends `on${infer X}` ? Uncapitalize<X> : never
type WithLeadingOn<T extends string> = `on${Capitalize<T>}`

function removeOnPrefix<T extends WithLeadingOn<keyof GlobalEventHandlersEventMap>>(x: T): NoLeadingOn<T> {
	return x.charAt(2).toLowerCase() + x.substring(3) as NoLeadingOn<T>
}

type EventHandlers<ThisType = unknown> = {
	readonly [k in WithLeadingOn<keyof GlobalEventHandlersEventMap>]?: (this: ThisType, evt: GlobalEventHandlersEventMap[NoLeadingOn<k>]) => void
}

type CustomEventHandlers<ThisType = unknown> = {
	readonly onInserted?: (element: ThisType) => void
	readonly onRemoved?: (element: ThisType) => void
}

type Attributes = {
	readonly [attrName: string]: MRBox<string | number | boolean>
}

type StyleValues = {
	readonly [k in keyof WritableStyles]?: MRBox<CSSStyleDeclaration[k] | undefined>
}

type TagDescription<K extends string = string, ThisType = unknown> = EventHandlers<ThisType> & CustomEventHandlers<ThisType> & {
	readonly tag?: K
	readonly class?: ClassNameParts
	readonly attrs?: Attributes
}

type HTMLTagDescriptionBase = {
	readonly style?: StyleValues
}

export type HTMLTagDescription<K extends keyof HTMLElementTagNameMap = keyof HTMLElementTagNameMap> = HTMLTagDescriptionBase & TagDescription<K, HTMLElementTagNameMap[K]>

export type SVGTagDescription<K extends keyof SVGElementTagNameMap = keyof SVGElementTagNameMap> = TagDescription<K, SVGElementTagNameMap[K]>

type Maybe<E> = E | null | undefined
type ChildArray<E = unknown> = MRBox<Maybe<E>[]>
type HTMLChild = HTMLElement | MRBox<string | number>
export type HTMLChildArray = ChildArray<HTMLChild>
export type SVGChildArray = ChildArray<SVGElement>

// typings are weird here, had to cast
function resolveArgs<K, E>(a?: K | ChildArray<E>, b?: ChildArray<E>): [K, ChildArray<E> | undefined] {
	if(!a){
		return [{} as K, b]
	} else if(Array.isArray(a) || isRBox(a)){
		return [{} as K, a]
	} else {
		return [a, b]
	}
}

function populateTag<K extends string, T, E>(tagBase: Element, description: TagDescription<K, T>, children: ChildArray<E> | undefined, renderChild?: (el: Exclude<E, Node | null | undefined>) => Node | null): Binder | null {
	let binder: Binder | null = null

	if("class" in description){
		binder = makeClassname(
			binder,
			tagBase,
			description.class,
			// using classList here because on svg elements .className is readonly (in runtime)
			classname => tagBase.classList.value = classname
		) || binder
	}

	if("text" in description){
		const v = description.text!
		if(isRBox(v)){
			binder = watch(binder, tagBase, v, text => {
				tagBase.textContent = text + ""
			})
		}
		tagBase.textContent = unbox(v) + ""
	}

	if(description.attrs){
		for(const k in description.attrs){
			const v = description.attrs[k]!
			if(isRBox(v)){
				binder = watch(binder, tagBase, v, v => {
					if(v === false){
						tagBase.removeAttribute(k)
					} else if(v === true){
						tagBase.setAttribute(k, k)
					} else {
						tagBase.setAttribute(k, v + "")
					}
				})
			}
			tagBase.setAttribute(k, unbox(v) + "")
		}

	}

	for(const k in description){
		if(k.startsWith("on")){
			// I don't want to construct elaborat solid type here
			// I know the type will be correct, because it is enforced by function parameter type
			// so just be Any and that's it
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const handler = description[k as keyof EventHandlers] as any
			if(k === "onInserted"){
				(binder ||= getBinder(tagBase)).onInserted(handler)
			} else if(k === "onRemoved"){
				(binder ||= getBinder(tagBase)).onRemoved(handler)
			} else {
				const evtName = removeOnPrefix(k as WithLeadingOn<keyof GlobalEventHandlersEventMap>)
				tagBase.addEventListener(evtName, handler, {passive: true, capture: false})
			}
		}
	}

	if(children){
		const setChildren = (children: Maybe<E>[]) => {
			const childTags: Node[] = []
			for(const child of children){

				if(child === null || child === undefined){
					return
				}
				if(child instanceof Node){
					childTags.push(child)
				}
				if(renderChild){
					const rendered = renderChild(child as Exclude<E, Node | null | undefined>)
					if(rendered !== null){
						childTags.push(rendered)
					}
				}
			}
			updateChildren(tagBase, childTags)
		}

		if(isRBox(children)){
			binder = watch(binder, tagBase, children, children => {
				setChildren(children)
			})
		}
		setChildren(unbox(children))
	}
	return binder
}

export function tag(): HTMLDivElement
export function tag<K extends keyof HTMLElementTagNameMap = "div">(description: HTMLTagDescription<K>): HTMLElementTagNameMap[K]
export function tag(children: HTMLChildArray): HTMLDivElement
export function tag<K extends keyof HTMLElementTagNameMap = "div">(description: HTMLTagDescription<K>, children: HTMLChildArray): HTMLElementTagNameMap[K]

export function tag<K extends keyof HTMLElementTagNameMap = "div">(a?: HTMLTagDescription<K> | HTMLChildArray, b?: HTMLChildArray): HTMLElementTagNameMap[K] {
	const [description, children] = resolveArgs(a, b)

	const tagBase = document.createElement(description.tag || "div")

	let binder = populateTag(tagBase, description, children, renderHTMLChild)

	if(description.style){
		for(const k in description.style){
			const styleValue = description.style[k]
			if(isRBox(styleValue)){
				binder = watch(binder, tagBase, styleValue, v => {
					if(v === undefined){
						tagBase.style.removeProperty(k)
					} else {
						tagBase.style[k] = v as string // ew
					}
				})
			}
			// ewwwww.
			const value = unbox(styleValue)
			if(value !== undefined){
				tagBase.style[k] = value + ""
			}
		}
	}

	return tagBase as HTMLElementTagNameMap[K]
}

function renderHTMLChild(child: Exclude<HTMLChild, Node>): Node | null {
	if(isRBox(child)){
		const node = document.createTextNode(child() + "")
		watch(null, node, child, value => node.textContent = value + "")
		return node
	}
	if(typeof(child) === "string" || typeof(child) === "number"){
		if(child === ""){
			return null
		}
		return document.createTextNode(child + "")
	}
	return null
}

export function svgTag(): SVGGElement
export function svgTag<K extends keyof SVGElementTagNameMap = "g">(description: SVGTagDescription<K>): SVGElementTagNameMap[K]
export function svgTag(children: SVGChildArray): SVGGElement
export function svgTag<K extends keyof SVGElementTagNameMap = "g">(description: SVGTagDescription<K>, children: SVGChildArray): SVGElementTagNameMap[K]

export function svgTag<K extends keyof SVGElementTagNameMap = "g">(a?: SVGTagDescription<K> | SVGChildArray, b?: SVGChildArray): SVGElementTagNameMap[K] {
	const [description, children] = resolveArgs(a, b)

	const tagBase = document.createElementNS("http://www.w3.org/2000/svg", description.tag || "g")

	if(description.tag === "svg"){
		tagBase.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink")
	}

	populateTag(tagBase, description, children)

	return tagBase as SVGElementTagNameMap[K]
}

function updateChildren(parent: Element, newChildren: readonly Node[]): void {
	for(let i = 0; i < newChildren.length; i++){
		const childTag = newChildren[i]!
		const x = parent.children[i]
		if(x === childTag){
			continue
		}
		if(x){
			parent.insertBefore(childTag, x)
		} else {
			parent.appendChild(childTag)
		}
	}

	while(parent.children[newChildren.length]){
		parent.children[newChildren.length]!.remove()
	}
}

/** This function is a way to subscribe to arbitrary boxes without making memory leak
 * Subscriptions will only be called when the component is in the DOM
 * (with the only exception being first immediate call, which will happen regardless of mount state) */
export function whileMounted<T>(el: Element, box: MRBox<T>, handler: (value: T) => void, opts: {dontCallImmediately?: boolean} = {}): void {
	(opts.dontCallImmediately ? watch : watchAndRun)(null, el, box, handler)
}

function watch<T>(binder: Binder | null, node: Node, value: MRBox<T>, handler: (value: T) => void): Binder | null {
	if(!isRBox(value) || isConstBox(value)){
		return binder
	}

	(binder ||= getBinder(node)).watch(value, handler)
	return binder
}

function watchAndRun<T>(binder: Binder | null, node: Node, value: MRBox<T>, handler: (value: T) => void): Binder | null {
	if(!isRBox(value) || isConstBox(value)){
		handler(unbox(value))
		return binder
	}

	(binder ||= getBinder(node)).watch(value, handler)
	return binder
}