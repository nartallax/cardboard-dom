import {MRBox, RBox, isConstBox, isRBox, unbox} from "@nartallax/cardboard"
import {ClassNameParts, makeClassname} from "src/classname"
import {getBinder} from "src/node_binding"
import {Binder} from "src/parts/binder"

type NoLeadingOn<T extends `on${string}`> = T extends `on${infer X}` ? Uncapitalize<X> : never
type WithLeadingOn<T extends string> = `on${Capitalize<T>}`
type EventHandlers<ThisType = unknown> = {
	readonly [k in WithLeadingOn<keyof GlobalEventHandlersEventMap>]?: (this: ThisType, evt: GlobalEventHandlersEventMap[NoLeadingOn<k>]) => void
}

export function removeOnPrefix<T extends WithLeadingOn<keyof GlobalEventHandlersEventMap>>(x: T): NoLeadingOn<T> {
	return x.charAt(2).toLowerCase() + x.substring(3) as NoLeadingOn<T>
}


type CustomEventHandlers<ThisType = unknown> = {
	// TODO: change this to afterInserted/beforeInserted, afterRemoved
	readonly onInserted?: (element: ThisType) => void
	readonly onRemoved?: (element: ThisType) => void
}

type Attributes = {
	// TODO: null here?
	readonly [attrName: string]: MRBox<string | number | boolean | undefined>
}

export interface TagDescription<K extends string = string, ThisType = unknown> extends EventHandlers<ThisType>, CustomEventHandlers<ThisType>{
	readonly tag?: K
	readonly class?: ClassNameParts
	readonly attrs?: Attributes
}

export type Maybe<E> = E | null | undefined
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

export function resolveContainerTagCreationArgs<D>(a: any, b: any, c: any, d: any): [D, RBox<readonly unknown[]>, (item: unknown, index: number) => unknown, (item: unknown) => HTMLElement] {
	const description: D = d ? a : undefined
	const childItems: RBox<readonly unknown[]> = d ? b : a
	const getKey: (item: unknown, index: number) => unknown = d ? c : b
	const renderChild: (item: unknown) => HTMLElement = d ? d : c
	return [description, childItems, getKey, renderChild]
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
		tagBase.replaceChildren(...renderChildren(children, renderChild))
	}

	return binder
}

function renderChildren<E>(children: readonly Maybe<E>[], renderChild?: (el: Exclude<E, Node | null | undefined>) => Node | null): Node[] {
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

// TODO: bad naming, do something about it
/** This function is a way to subscribe to arbitrary boxes without making memory leak
 * Subscriptions will only be called when the component is in the DOM
 * (with the only exception being first immediate call, which will happen regardless of mount state) */
export function whileMounted<T>(el: Element, box: MRBox<T>, handler: (value: T) => void, opts?: {dontCallImmediately?: boolean}): void {
	(opts?.dontCallImmediately ? watch : watchAndRun)(null, el, box, handler)
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
export function watchAndRun<T>(binder: Binder | null, node: Node, value: MRBox<T>, handler: (value: T) => void): Binder | null {
	if(!isRBox(value) || isConstBox(value)){
		handler(unbox(value))
		return binder
	}

	(binder ||= getBinder(node)).watchAndRun(value, handler)
	return binder
}

// TODO: after our changes "onInserted" will be invoked BEFORE actual DOM tree insertion
// so we need to rethink it
export function onMount(el: Element, handler: (() => void) | (() => () => void)): void {
	const binder = getBinder(el)
	binder.onInserted(() => {
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
	})
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
	watchAndRun(null, parent, childItems, childItems => {
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