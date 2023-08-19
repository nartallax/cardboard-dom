import {RBox} from "@nartallax/cardboard"

const noValue = Symbol("cardboard-dom-binder-no-value")
type NoValue = typeof noValue

interface WatchedBox<T = unknown>{
	readonly box: RBox<T>
	handler(value: T): void
	handlerWrap: null | ((value: T) => void)
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
	private isInDom: boolean
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
				const box = boxes[i]!
				// TODO: this is extremely bad way to do what we need to do
				// but it'll do for now
				// we do this because box is throwing errors when detached from upstream
				// and the fix is long and inobvious
				// this error should be resolved when (if) I rewrite cardboard to properly use value versioning
				//
				// the source of this error is - elements are rendered synchronously, and subscribed synchronously
				// but the updates to the DOM tree are asynchronous
				// so, when update is here already, box that was subscribed to in render phase can be detached already
				try {
					const value = box.box.get()
					if(box.lastKnownValue !== value){
						this.invokeBoxHandler(value, box)
					}
					this.subToBox(box)
				} catch(e){
					box.handlerWrap = () => {/* noop */}
					console.warn("Box update error ignored: " + e)
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
		fireAll(this.afterInsertedHandlers)
	}

	notifyAfterRemoved(): void {
		if(!this.isInDom){
			return
		}
		// console.log("afterremoved", this.node)
		this.isInDom = false
		this.isExpectingInsertion = false // in case of some weird tree manipulations
		const boxes = this.watchedBoxes
		if(boxes){
			for(let i = 0; i < boxes.length; i++){
				const box = boxes[i]!
				if(box.handlerWrap){
					// TODO: why are we not null-ing unsub fn here?
					box.box.unsubscribe(box.handlerWrap)
				}
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

	private invokeBoxHandler<T>(value: T, box: WatchedBox<T>): void {
		box.handler(value)
		box.lastKnownValue = value
	}

	private subToBox(box: WatchedBox): void {
		// TODO: cringe
		box.handlerWrap = v => this.invokeBoxHandler(v, box)
		box.box.subscribe(box.handlerWrap)
	}

	private subscribe<T>(box: RBox<T>, handler: (value: T) => void): {unsub(): void, watchedBox: WatchedBox} {
		const watchedBox: WatchedBox = {
			box,
			handler,
			lastKnownValue: noValue,
			handlerWrap: null
		}
		if(this.isInDom){
			this.subToBox(watchedBox)
		}
		(this.watchedBoxes ||= []).push(watchedBox)
		return {
			unsub: () => {
				this.watchedBoxes = dropItemFromArray(this.watchedBoxes, watchedBox)
			},
			watchedBox
		}
	}

	watch<T>(box: RBox<T>, handler: (value: T) => void): () => void {
		return this.subscribe(box, handler).unsub
	}

	watchAndRun<T>(box: RBox<T>, handler: (value: T) => void): () => void {
		const {unsub, watchedBox} = this.subscribe(box, handler)
		this.invokeBoxHandler(box.get(), watchedBox)
		return unsub
	}

	unwatch<T>(box: RBox<T>, handler: (value: T) => void): void {
		this.watchedBoxes = this.watchedBoxes?.filter(x => x.box === box && x.handler === handler) ?? null
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