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
		if(!node.isConnected){
			this.projectedTreeState.markNodeRemoved(node)
		}

		const binders = this.collectBinders(node)
		for(let i = 0; i < binders.length; i++){
			const binder = binders[i]!
			if(!binder.node.isConnected){
				binder.notifyAfterRemoved()
			} else {
				binder.notifyAfterInserted()
			}
		}
	}

}