import {Binder} from "src/parts/binder"
import {AsyncMutationWatcher} from "src/parts/async_mutation_watcher"
import {SyncMutationWatcher} from "src/parts/sync_mutation_watcher"
import {MRBox} from "@nartallax/cardboard"
import {BoxHandlerBindingOptions, bindBoxWithHandler, unbindBoxWithHandler} from "src/functions/base_tag"
import {DomBoxBindingOptions, bindBoxToDomValue, unbindBoxToDom} from "src/box_dom_binding/bind_box_to_dom"
import {MaybeArray, isArray} from "src/functions/utils"

const binders = new WeakMap<Node, Binder>()
const asyncWatcher = new AsyncMutationWatcher(binders)
const syncWatcher = new SyncMutationWatcher(binders)

/** This function allows to stop debug observer from working
 * Debug observer only exists to warn you about improper DOM manipulations;
 * if there are none, it's safe to turn off to reclaim some performance. */
export const shutdownDebugObserver = () => asyncWatcher.shutdown()

/** Initialize DOM bindings.
 *
 * This function must be called before any DOM manipulations, otherwise things can go wrong.
 * It won't do harm to call it more than once, if you're uncertain if you did that already or not. */
export const initializeCardboardDom = async(): Promise<void> => {
	// this function is async for futureproofing
	asyncWatcher.init()
	syncWatcher.init()
	/* Explaination about this function:
	v8 (and maybe other engines, untested), when calling a method, will resolve implementation first, and then arguments
	this is fine 99.9% of the time, but that will lead to unexpected results if the argument is a call and it changes the method
	In other words,

		let button = patchAppendAndMakeButton()
		document.body.append(button)

	will call patched method, but

		document.body.append(patchAppendAndMakeButton())

	will call original one.
	To avoid this weird effect, this init function exists. */
}

export const getBinder = (node: Node): Binder => {
	if(!syncWatcher.isInitialized()){
		throw new Error("Cardboard DOM is not initialized! You need to call initializeCardboardDom() first.")
	}
	let binder = binders.get(node)
	if(!binder){
		binder = new Binder(node)
		binders.set(node, binder)
	}
	return binder
}

/** This function is a way to subscribe to arbitrary box without making memory leak
 * Subscriptions will only be called when the component is in the DOM
 * (with the only exception being first immediate call, which will happen regardless of mount state) */
export function bindBox<T>(node: Node, box: MaybeArray<MRBox<T>>, handler: (value: T) => void, opts?: BoxHandlerBindingOptions): void
/** This function is a way to link arbitrary box to some of well-known DOM values,
 * like URL parts or local storage values
 *
 * In case there's API for receiving updates for the value and the box is wbox,
 * the box will receive updates from DOM.
 * Otherwise only the DOM value will be updated by box's value. */
export function bindBox<T>(node: Node, box: MaybeArray<MRBox<T>>, options: DomBoxBindingOptions<T>): void
export function bindBox<T>(node: Node, box: MaybeArray<MRBox<T>>, a: DomBoxBindingOptions<T> | ((value: T) => void), b?: BoxHandlerBindingOptions): void {
	for(const bx of isArray(box) ? box : [box]){
		if(typeof(a) === "function"){
			bindBoxWithHandler(node, bx, a, b)
		} else {
			bindBoxToDomValue(node, bx, a)
		}
	}
}

export function unbindBox<T>(node: Node, handler: (value: T) => void): void
export function unbindBox<T>(node: Node, options: DomBoxBindingOptions<T>): void
export function unbindBox<T>(node: Node, a: DomBoxBindingOptions<T> | ((value: T) => void)): void {
	if(typeof(a) === "function"){
		unbindBoxWithHandler(node, a)
	} else {
		unbindBoxToDom(node, a)
	}
}