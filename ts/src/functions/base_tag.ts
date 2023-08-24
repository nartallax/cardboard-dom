import {BoxChangeHandler, MRBox, RBox, Unboxed, constBoxWrap, isConstBox, isRBox, unbox} from "@nartallax/cardboard"
import {ClassNameParts, makeClassname} from "src/functions/classname"
import {bindBox, getBinder} from "src/node_binding"
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
	readonly class?: ClassNameParts
	readonly attrs?: Attributes
}

export type Maybe<E> = E | null | undefined
export type MaybeArray<E> = E | readonly E[]
export type ChildArray<E = unknown> = readonly Maybe<E>[]

export function resolveTagCreationArgs<K, E>(a?: K | ChildArray<E>, b?: ChildArray<E>): [K, ChildArray<E> | undefined] {
	if(!a){
		return [{} as K, b]
	} else if(Array.isArray(a)){
		return [{} as K, a]
	} else {
		return [a as K, b]
	}
}

export function makeContainerTagFn<C, D, R extends Node>(renderByDescription: (desc?: D) => R, renderChild?: (el: Exclude<C, Node | null | undefined>) => Node | null): (a: any, b: any, c?: any, d?: any) => R {
	return (a, b, c, d) => {
		const argumentCount = d !== undefined ? 4 : c !== undefined ? 3 : 2
		const isArrayContainer = argumentCount === 4 || (argumentCount === 3 && isRBox(a))
		let result: R
		if(isArrayContainer){
			const description: D = d ? a : undefined
			const childItems: RBox<readonly unknown[]> = d ? b : a
			const getKey: (item: unknown, index: number) => unknown = d ? c : b
			const renderChild: (item: unknown) => R = d ? d : c
			result = renderByDescription(description)
			bindChildArrayToTag(result, childItems, getKey, renderChild)
		} else {
			const description: D = c ? a : undefined
			const boxesOrBox: MaybeArray<MRBox<unknown>> = c ? b : a
			const render: (...args: unknown[]) => MaybeArray<unknown> = c ? c : b
			const boxes = Array.isArray(boxesOrBox) ? boxesOrBox : [boxesOrBox]

			result = renderByDescription(description)

			const reRenderChildren = () => {
				const args = boxes.map(box => unbox(box))
				const newChildOrSeveral = render(...args)
				const newChildren = Array.isArray(newChildOrSeveral) ? newChildOrSeveral : [newChildOrSeveral]
				updateChildren(result, renderChildren(newChildren, renderChild))
			}

			for(let i = 0; i < boxes.length; i++){
				bindBox(result, boxes[i], reRenderChildren, {dontCallImmediately: true})
			}
			reRenderChildren()
		}
		return result
	}
}

export function populateTag<K extends string, T, E>(tagBase: Element, description: TagDescription<K, T>, children: ChildArray<E> | undefined, renderChild?: (el: Exclude<E, Node | null | undefined>) => Node | null): Binder | null {
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

	if(description.attrs){
		for(const k in description.attrs){
			binder = watchAndRun(binder, tagBase, description.attrs[k]!, v => {
				setAttribute(tagBase, k, v)
			})
		}
	}

	for(const k in description){
		if(k.startsWith("on")){
			// I don't want to construct elaborat solid type here
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
		tagBase.replaceChildren(...renderChildren(children, renderChild))
	}

	return binder
}

export function renderChildren<E>(children: readonly Maybe<E>[], renderChild?: (el: Exclude<E, Node | null | undefined>) => Node | null): Node[] {
	const childTags: Node[] = []
	for(const child of children){
		if(child === null || child === undefined || child === true || child === false){
			continue
		}
		if(child instanceof Node){
			childTags.push(child)
			continue
		}
		if(renderChild){
			const rendered = renderChild(child as Exclude<E, Node | null | undefined>)
			if(rendered !== null){
				childTags.push(rendered)
			}
		}
	}
	return childTags
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

function updateChildren(parent: Node, newChildren: readonly Node[]): void {
	for(let i = 0; i < newChildren.length; i++){
		const childTag = newChildren[i]!
		const x = parent.childNodes[i]
		if(x === childTag){
			continue
		}
		if(x){
			parent.insertBefore(childTag, x)
		} else {
			parent.appendChild(childTag)
		}
	}

	while(parent.childNodes[newChildren.length]){
		parent.childNodes[newChildren.length]!.remove()
	}
}

export function bindChildArrayToTag<T, K>(parent: Node, childItems: RBox<readonly T[]>, getKey: (item: T, index: number) => K, renderChild: (item: RBox<T>) => Node): void {
	const arrayContext = childItems.getArrayContext(getKey)
	const keyToChildMap = new Map<unknown, Node>()

	watchAndRun(null, parent, childItems, (childItems, _, meta) => {
		if(meta){
			switch(meta.type){
				case "array_item_update": {
					// fully processed by array context, no action required
					return
				}

				case "array_items_insert": {
					const nextChild = parent.childNodes[meta.index]
					for(let offset = 0; offset < meta.count; offset++){
						const index = meta.index + offset
						const key = getKey(childItems[index]!, index)
						const child = renderChild(arrayContext.getBoxForKey(key))
						keyToChildMap.set(key, child)
						if(nextChild){
							parent.insertBefore(child, nextChild)
						} else {
							parent.appendChild(child)
						}
					}
					return
				}

				case "array_items_delete": {
					for(const {index, value} of meta.indexValuePairs){
						const key = getKey(value as T, index)
						const child = keyToChildMap.get(key)
						if(!child){
							throw new Error("Tried to delete child at key " + key + ", but there's no item for that key.")
						}
						parent.removeChild(child)
						keyToChildMap.delete(key)
					}
					return
				}

				case "array_items_delete_all": {
					while(parent.firstChild){
						parent.removeChild(parent.firstChild)
					}
					keyToChildMap.clear()
					return
				}

			}
		}

		const newChildArray: Node[] = new Array(childItems.length)
		const outdatedKeys = new Set(keyToChildMap.keys())
		for(let i = 0; i < childItems.length; i++){
			const childItem = childItems[i]!
			const key = getKey(childItem, i)
			let child = keyToChildMap.get(key)
			if(!child){
				const box = arrayContext.getBoxForKey(key)
				child = renderChild(box)
				keyToChildMap.set(key, child)
			}
			newChildArray[i] = child
			outdatedKeys.delete(key)
		}

		for(const outdatedKey of outdatedKeys){
			keyToChildMap.delete(outdatedKey)
		}

		updateChildren(parent, newChildArray)
	})
}