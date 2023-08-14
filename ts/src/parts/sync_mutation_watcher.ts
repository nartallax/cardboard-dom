import {Binder} from "src/parts/binder"
import {monkeyPatchDomForInsertRemove} from "src/parts/dom_monkeypatching"

/** TODO: tests:
 * 1. remove some node in beforeInsert
 * 2. insert some node in afterRemove
 * 3. remove child of removed node in afterRemove, so childNodes "slip" and skip a node
 * 4. remove parent from dom tree in beforeInsert, so ongoing handler calls are no more valid
 */
export class SyncMutationWatcher {

	private isInit = false

	constructor(readonly binders: WeakMap<Node, Binder>) {}

	init(): void {
		if(!this.isInit){
			this.isInit = true
			monkeyPatchDomForInsertRemove(
				this.beforeInserted.bind(this),
				this.afterRemovedOrInserted.bind(this)
			)
		}
	}

	private beforeInserted(node: Node, ancestor: Node): void {
		// we need to check it for each node
		// because ancestor can get detached as result of work of beforeInsert handlers
		if(ancestor.isConnected){
			const binder = this.binders.get(node)
			if(binder){
				binder.notifyBeforeInserted()
			}
			for(let i = 0; i < node.childNodes.length && ancestor.isConnected; i++){
				this.beforeInserted(node.childNodes[i]!, ancestor)
			}
		}
	}

	private afterRemovedOrInserted(node: Node): void {
		if(!node.isConnected){
			const binder = this.binders.get(node)
			if(binder){
				binder.notifyAfterRemoved()
			}
			for(let i = 0; i < node.childNodes.length && !node.isConnected; i++){
				this.afterRemovedOrInserted(node.childNodes[i]!)
			}
		}
	}

}