import {BoxChangeHandler, BoxUpdateMeta, MRBox, RBox, Unboxed, constBoxWrap, isConstBox, isRBox, unbox} from "@nartallax/cardboard"
import {ClassName, bindClassname} from "src/functions/classname"
import {Maybe, MaybeArray, isArray} from "src/functions/utils"
import {getBinder} from "src/node_binding"
import {Binder} from "src/parts/binder"

type NoLeadingOn<T extends `on${string}`> = T extends `on${infer X}` ? Uncapitalize<X> : never
type WithLeadingOn<T extends string> = `on${Capitalize<T>}`
type EventHandlers<ThisType = unknown> = {
	readonly [k in WithLeadingOn<keyof GlobalEventHandlersEventMap>]?: (this: ThisType, evt: GlobalEventHandlersEventMap[NoLeadingOn<k>]) => void
}

export type UnboxedTuple<D> = D extends readonly [infer X, ...infer Rest]
	? readonly [Unboxed<X>, ...UnboxedTuple<Rest>]
	: D extends []
		? []
		: D extends readonly MRBox<unknown>[]
			? readonly Unboxed<D[number]>[]
			: never

export function removeOnPrefix<T extends WithLeadingOn<keyof GlobalEventHandlersEventMap>>(x: T): NoLeadingOn<T> {
	return x.charAt(2).toLowerCase() + x.substring(3) as NoLeadingOn<T>
}


type CustomEventHandlers<ThisType = unknown> = {
	readonly beforeInserted?: (element: ThisType) => void
	readonly afterInserted?: (element: ThisType) => void
	readonly onRemoved?: (element: ThisType) => void
}

type Attributes = {
	readonly [attrName: string]: MRBox<string | number | boolean | undefined | null>
}

export interface TagDescription<K extends string = string, ThisType = unknown> extends EventHandlers<ThisType>, CustomEventHandlers<ThisType>{
	readonly tag?: K
	readonly class?: ClassName
	readonly attrs?: Attributes
}

type NonBoxedSingleChildArrayElement<E> = Maybe<E | string | number | boolean>
export type ChildArray<E> = readonly MRBox<MaybeArray<NonBoxedSingleChildArrayElement<E>>>[]

export function resolveTagCreationArgs<K, E>(a?: K | ChildArray<E>, b?: ChildArray<E>): [K, ChildArray<E> | undefined] {
	if(!a){
		return [{} as K, b]
	} else if(Array.isArray(a)){
		return [{} as K, a]
	} else {
		return [a as K, b]
	}
}

export function populateTag<K extends string, T, E extends Element>(tagBase: Element, description: TagDescription<K, T>, children: ChildArray<E> | undefined): Binder | null {
	let binder: Binder | null = null

	if("class" in description){
		binder = bindClassname(
			binder,
			tagBase,
			description.class,
			// using classList here because on svg elements .className is readonly (in runtime)
			classname => tagBase.classList.value = classname
		) || binder
	}

	if(description.attrs){
		for(const k in description.attrs){
			binder = watchAndRun(binder, tagBase, description.attrs[k]!, v => {
				setAttribute(tagBase, k, v)
			})
		}
	}

	for(const k in description){
		if(k.startsWith("on")){
			// I don't want to construct elaborate solid type here
			// I know the type will be correct, because it is enforced by function parameter type
			// so just be Any and that's it
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const handler = description[k as keyof EventHandlers] as any
			if(k === "beforeInserted"){
				(binder ||= getBinder(tagBase)).onInserted(handler, true)
			} else if(k === "afterInserted"){
				(binder ||= getBinder(tagBase)).onInserted(handler, false)
			} else if(k === "onRemoved"){
				(binder ||= getBinder(tagBase)).onRemoved(handler)
			} else {
				const evtName = removeOnPrefix(k as WithLeadingOn<keyof GlobalEventHandlersEventMap>)
				tagBase.addEventListener(evtName, handler, {passive: true, capture: false})
			}
		}
	}

	if(children){
		const updateFn = (_: any, box: RBox<MaybeArray<NonBoxedSingleChildArrayElement<E>>> | undefined, meta: BoxUpdateMeta | undefined) => updateChildren<E>(tagBase, children, box, meta)

		for(const child of children){
			if(isRBox(child)){
				(binder ||= getBinder(tagBase)).watch(child, updateFn, true)
			}
		}
		updateFn(null, undefined, undefined)
	}

	return binder
}

// function findChildStartIndex<E>(children: ChildArray<E>, updatedBox: RBox<MaybeArray<NonBoxedSingleChildArrayElement<E>>>): number {
// 	let index = 0
// 	for(let i = 0; i < children.length; i++){
// 		const childBox = children[i]!
// 		if(childBox === updatedBox){
// 			return index
// 		}
// 		const child = unbox(children[i]!)
// 		if(isArray(child)){
// 			index += child.length
// 		} else if(!isEmptyChild(child)){
// 			index++
// 		}
// 	}

// 	throw new Error("The child box is not element of child array")
// }

function updateChildren<E extends Element>(parent: Node, children: ChildArray<E>, updatedBox: RBox<MaybeArray<NonBoxedSingleChildArrayElement<E>>> | undefined, meta: BoxUpdateMeta | undefined): void {
	if(updatedBox){
		switch(meta?.type){
			// we could go on, but other optimizations are quite complex (and more rare)
			// that is, if there will be good cases - I'll add them, but now it's not worth it
			case "array_item_update":{
				const oldValue = meta.oldValue
				const newValue = (updatedBox.get() as NonBoxedSingleChildArrayElement<E>[])[meta.index]!
				// Element and not Node here because text nodes should still be updated by parent element
				if(oldValue instanceof Element && newValue instanceof Element){
					return // it's fully handled alredy
				}
				break
			}
		}
	}


	let index = 0
	for(const wrappedChild of children){
		const child = unbox(wrappedChild)
		if(isArray(child)){
			for(let i = 0; i < child.length; i++){
				index = updateChildAt(parent, child[i]!, index)
			}
		} else {
			index = updateChildAt(parent, child, index)
		}
	}

	while(parent.childNodes.length > index){
		// Q: why last child instead of `index`-th?
		// A: I have a feeling that it's more performant, to pop the last one
		// no confirmation though
		parent.removeChild(parent.childNodes[parent.childNodes.length - 1]!)
	}
}

function isEmptyChild<E>(child: NonBoxedSingleChildArrayElement<E>): boolean {
	return child === null || child === undefined || child === true || child === false
}

function updateChildAt<E extends Element>(parent: Node, child: NonBoxedSingleChildArrayElement<E>, index: number): number {
	if(isEmptyChild(child)){
		return index
	}

	let childNode: Node
	if(child instanceof Node){
		childNode = child
	} else {
		const childText = child + ""
		const existingChildNode = parent.childNodes[index]
		if(existingChildNode instanceof Text){
			existingChildNode.textContent = childText
			return index + 1
		}
		childNode = document.createTextNode(childText)
	}

	// why do I have to cast this...? TS is weird here
	if(parent.childNodes[index] as Node | undefined === childNode){
		return index + 1
	}
	if(parent.childNodes.length <= index){
		parent.appendChild(childNode)
	} else {
		parent.insertBefore(childNode, parent.childNodes[index]!)
	}
	return index + 1
}

function setAttribute(tagBase: Element, attrName: string, value: Attributes[string]): void {
	if(value === false || value === undefined){
		tagBase.removeAttribute(attrName)
	} else if(value === true){
		tagBase.setAttribute(attrName, attrName)
	} else {
		tagBase.setAttribute(attrName, value + "")
	}
}

export interface BoxHandlerBindingOptions {
	readonly dontCallImmediately?: boolean
}

export function bindBoxWithHandler<T>(el: Node, box: MRBox<T>, handler: (value: T) => void, opts?: BoxHandlerBindingOptions): void {
	(opts?.dontCallImmediately ? watch : watchAndRun)(null, el, box, handler)
}

export function unbindBoxWithHandler<T>(el: Node, handler: (value: T) => void): void {
	getBinder(el).unwatch(handler)
}

function watch<T>(binder: Binder | null, node: Node, value: MRBox<T>, handler: (value: T) => void): Binder | null {
	if(!isRBox(value) || isConstBox(value)){
		return binder
	}

	(binder ||= getBinder(node)).watch(value, handler)
	return binder
}

// watchAndRun cannot be substituted with just doing the actions and calling watch() with same box and node
// because watchAndRun will also notify binder about last used value
// this helps to avoid some weird situations and double-running of the same code
export function watchAndRun<T>(binder: Binder | null, node: Node, value: MRBox<T>, handler: BoxChangeHandler<T>): Binder | null {
	if(!isRBox(value) || isConstBox(value)){
		handler(unbox(value), constBoxWrap(value), undefined)
		return binder
	}

	(binder ||= getBinder(node)).watchAndRun(value, handler)
	return binder
}

type OnMountOptions = {
	/** If true, will invoke handler before node is in DOM, not after
	 * DOM manipulations should be avoided if this option is enabled,
	 * because it may lead to unexpected behaviour */
	readonly beforeInserted?: boolean
	/** What to do if the node is already in DOM at the time of `onMount()` call?
	 * "throw" (default) - throw an error. Because most of the time both calling or not calling the handler is unexpected.
	 * "nothing" - don't call the handler
	 * "call" - call the handler */
	readonly ifInDom?: "throw" | "nothing" | "call"
}

/** This function will attach handler to an element, to be called when element is inserted into the DOM.
 * Handler can then return another function, which will be executed when element is removed from the DOM. */
export function onMount(el: Element, handler: (() => void) | (() => () => void), options?: OnMountOptions): void {
	const binder = getBinder(el)

	const onInserted = () => {
		const result = handler()
		if(typeof(result) === "function"){
			const removeHandler = () => {
				try {
					result()
				} finally {
					binder.offRemoved(removeHandler)
				}
			}
			binder.onRemoved(removeHandler)
		}
	}

	if(binder.isInDom){
		switch(options?.ifInDom ?? "throw"){
			case "throw": throw new Error("Node is already in DOM, that's unexpected")
			case "call": onInserted(); break
		}
	}
	binder.onInserted(onInserted, options?.beforeInserted)
}