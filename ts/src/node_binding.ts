import {Binder} from "src/parts/binder"
import {AsyncMutationWatcher} from "src/parts/async_mutation_watcher"
import {SyncMutationWatcher} from "src/parts/sync_mutation_watcher"

const binders = new WeakMap<Node, Binder>()
const asyncWatcher = new AsyncMutationWatcher(binders)
const syncWatcher = new SyncMutationWatcher(binders)

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