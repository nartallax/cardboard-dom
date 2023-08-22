import {Binder} from "src/parts/binder"
import {AsyncMutationWatcher} from "src/parts/async_mutation_watcher"
import {SyncMutationWatcher} from "src/parts/sync_mutation_watcher"
import {MRBox} from "@nartallax/cardboard"
import {BoxHandlerBindingOptions, bindBoxWithHandler, unbindBoxWithHandler} from "src/functions/base_tag"
import {DomBoxBindingOptions, bindBoxToDomValue, unbindBoxToDom} from "src/box_dom_binding/bind_box_to_dom"

const binders = new WeakMap<Node, Binder>()
const asyncWatcher = new AsyncMutationWatcher(binders)
const syncWatcher = new SyncMutationWatcher(binders)

/** This function allows to stop debug observer from working
 * Debug observer only exists to warn you about improper DOM manipulations;
 * if there are none, it's safe to turn off to reclaim some performance. */
export const shutdownDebugObserver = () => asyncWatcher.shutdown()

export const getBinder = (node: Node): Binder => {
	asyncWatcher.init()
	syncWatcher.init()
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
export function bindBox<T>(node: Node, box: MRBox<T>, handler: (value: T) => void, opts?: BoxHandlerBindingOptions): void
/** This function is a way to link arbitrary box to some of well-known DOM values,
 * like URL parts or local storage values
 *
 * In case there's API for receiving updates for the value and the box is wbox,
 * the box will receive updates from DOM.
 * Otherwise only the DOM value will be updated by box's value. */
export function bindBox<T>(node: Node, box: MRBox<T>, options: DomBoxBindingOptions<T>): void
export function bindBox<T>(node: Node, box: MRBox<T>, a: DomBoxBindingOptions<T> | ((value: T) => void), b?: BoxHandlerBindingOptions): void {
	if(typeof(a) === "function"){
		bindBoxWithHandler(node, box, a, b)
	} else {
		bindBoxToDomValue(node, box, a)
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