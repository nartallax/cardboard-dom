import {Binder} from "src/parts/binder"
import {monkeyPatchDomForInsertRemove} from "src/parts/dom_monkeypatching"
import {ProjectedTreeState} from "src/parts/projected_tree_state"

export class SyncMutationWatcher {

	private isInit = false
	private readonly projectedTreeState = new ProjectedTreeState()

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

	private collectBinders(node: Node, result: Binder[] = []): Binder[] {
		const binder = this.binders.get(node)
		if(binder){
			result.push(binder)
		}
		for(let i = 0; i < node.childNodes.length; i++){
			this.collectBinders(node.childNodes[i]!, result)
		}
		return result
	}

	private beforeInserted(node: Node, parent: Node): void {
		if(!this.projectedTreeState.isInserted(parent)){
			return
		}

		this.projectedTreeState.startInsertOperation(node)
		// console.log("startInsertOperation", node)
		try {
			const binders = this.collectBinders(node)
			for(let i = 0; (i < binders.length); i++){
				const binder = binders[i]!
				if(this.projectedTreeState.isInserted(binder.node)){
					binder.notifyBeforeInserted()
				}
			}
		} finally {
			this.projectedTreeState.endInsertOperation()
		}
	}

	private afterRemovedOrInserted(node: Node): void {
		if(!node.parentNode){
			// we can't rely on .isConnected here
			// because even if it is inserted, it may be not connected
			// because parent is not in the DOM yet
			// so, to see intent - if the node is removed or inserted somewhere - we can check .parentNode
			this.projectedTreeState.markNodeRemoved(node)
		}

		const binders = this.collectBinders(node)
		for(let i = 0; i < binders.length; i++){
			const binder = binders[i]!
			if(binder.node.isConnected){
				binder.notifyAfterInserted()
			} else {
				// console.log([...(this.projectedTreeState as any).nodesInTree])
				if(this.projectedTreeState.isInserted(binder.node)){
					continue // we'll call notify on this node after its parent is fully inserted
				}
				binder.notifyAfterRemoved()
			}
		}
	}

}