import {BoxChangeHandler, BoxUpdateMeta, RBox} from "@nartallax/cardboard"

const noValue = Symbol("cardboard-dom-binder-no-value")
type NoValue = typeof noValue

interface WatchedBox<T = unknown>{
	readonly box: RBox<T>
	handler: BoxChangeHandler<T>
	readonly handlerWrap: BoxChangeHandler<T>
	lastKnownValue: T | NoValue
}

// for tests
export let mismatchedNodesErrorCount = 0

/** Binder is a way to access various lifecycle events of DOM nodes
 * Through that it can help with subscription to various stuff like boxes */
export class Binder {
	private beforeInsertedHandlers = null as null | (() => void)[]
	private afterInsertedHandlers = null as null | (() => void)[]
	private removedHandlers = null as null | (() => void)[]
	private watchedBoxes = null as null | WatchedBox[]
	isInDom: boolean
	private isExpectingInsertion = false

	constructor(readonly node: Node) {
		this.isInDom = node.isConnected
	}

	onInserted(handler: () => void, before?: boolean): void {
		if(before){
			(this.beforeInsertedHandlers ||= []).push(handler)
		} else {
			(this.afterInsertedHandlers ||= []).push(handler)
		}
	}

	onRemoved(handler: () => void): void {
		(this.removedHandlers ||= []).push(handler)
	}

	offInserted(handler: () => void, before?: boolean): void {
		if(before){
			this.beforeInsertedHandlers = dropItemFromArray(this.beforeInsertedHandlers, handler)
		} else {
			this.afterInsertedHandlers = dropItemFromArray(this.afterInsertedHandlers, handler)
		}
	}

	offRemoved(handler: () => void): void {
		this.removedHandlers = dropItemFromArray(this.removedHandlers, handler)
	}

	notifyBeforeInserted(): void {
		if(this.isInDom){
			return
		}
		// console.log("beforeInserted", this.node)
		this.isInDom = true
		this.isExpectingInsertion = true
		const boxes = this.watchedBoxes
		if(boxes){
			for(let i = 0; i < boxes.length; i++){
				const boxWrap = boxes[i]!
				const value = boxWrap.box.get()
				boxWrap.box.subscribe(boxWrap.handlerWrap)
				if(boxWrap.lastKnownValue !== value){
					this.invokeBoxHandler(value, boxWrap, undefined)
				}
			}
		}

		fireAll(this.beforeInsertedHandlers)
	}

	notifyAfterInserted(): void {
		if(!this.isExpectingInsertion){
			return
		}
		this.isExpectingInsertion = false
		// console.log("afterinserted", this.node)
		fireAll(this.afterInsertedHandlers)
	}

	notifyAfterRemoved(): void {
		if(!this.isInDom){
			return
		}
		this.isInDom = false
		this.isExpectingInsertion = false // in case of some weird tree manipulations
		// console.log("removed", this.node)
		const boxes = this.watchedBoxes
		if(boxes){
			for(let i = 0; i < boxes.length; i++){
				const box = boxes[i]!
				box.box.unsubscribe(box.handlerWrap)
			}
		}

		fireAll(this.removedHandlers)
	}

	notifyAttachmentState(shouldBeAttached: boolean): void {
		if(this.isInDom !== shouldBeAttached){
			console.error(`A node was ${shouldBeAttached ? "inserted into" : "removed from"} DOM tree using unexpected method or property. This could result in memory leaks and/or inconsistent state. Please investigate and report an error.`, this.node)
			mismatchedNodesErrorCount++

			// this really should be done synchronously
			if(shouldBeAttached){
				this.notifyBeforeInserted()
			} else {
				this.notifyAfterRemoved()
			}
		}
	}

	private invokeBoxHandler<T>(value: T, box: WatchedBox<T>, meta: BoxUpdateMeta | undefined): void {
		box.handler(value, box.box, meta)
		box.lastKnownValue = value
	}

	private subscribe<T>(box: RBox<T>, handler: BoxChangeHandler<T>): WatchedBox<T> {
		const boxWrap: WatchedBox<T> = {
			box,
			handler,
			lastKnownValue: noValue,
			// wonder if creating a handler wrapper is more performant than storing lastKnownValue and handler in map
			handlerWrap: (v, _, meta) => this.invokeBoxHandler(v, boxWrap, meta)
		}
		if(this.isInDom){
			boxWrap.box.subscribe(boxWrap.handlerWrap)
		}
		(this.watchedBoxes ||= []).push(boxWrap as WatchedBox)
		return boxWrap
	}

	watch<T>(box: RBox<T>, handler: BoxChangeHandler<T>): void {
		this.subscribe(box, handler)
	}

	watchAndRun<T>(box: RBox<T>, handler: BoxChangeHandler<T>): void {
		const boxWrap = this.subscribe(box, handler)
		this.invokeBoxHandler(box.get(), boxWrap, undefined)
	}

	unwatch<T>(box: RBox<T>, handler: (value: T) => void): void {
		const filteredBoxes = this.watchedBoxes?.filter(boxWrap => {
			if(boxWrap.box === box && boxWrap.handler === handler){
				boxWrap.box.unsubscribe(boxWrap.handlerWrap)
				return false
			}
			return true
		})
		this.watchedBoxes = !filteredBoxes || filteredBoxes.length < 0 ? null : filteredBoxes
	}

}

// yeah, not very efficient
// though in real applications removal of something from watch list is not a frequent operation
// so, whatever
function dropItemFromArray<T>(arr: T[] | null, item: T): T[] | null {
	if(!arr || (arr.length === 1 && arr[0] === item)){
		return null
	}
	const result = [] as T[]
	for(let i = 0; i < arr.length; i++){
		const el = arr[i]!
		if(el !== item){
			result.push(el)
		}
	}
	return result
}

function fireAll(handlers: (() => void)[] | null): void {
	if(!handlers){
		return
	}
	for(let i = 0; i < handlers.length; i++){
		handlers[i]!()
	}
}