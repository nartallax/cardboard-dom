/** This class holds expected tree structure after all insert-handlers are invoked
 * We can't use just DOM tree for this purpose, because we need to run handlers before it is modified
 * And sometimes it leads to removal of children, and it can get complicated, resulting in some handlers not being invoked */
export class ProjectedTreeState {

	private readonly nodesInTree: Set<Node> = new Set()
	private ongoingInsertOperationsCount = 0

	startInsertOperation(node: Node): void {
		this.ongoingInsertOperationsCount++
		this.markNodeInserted(node)
	}

	endInsertOperation(): void {
		this.ongoingInsertOperationsCount--
		if(this.ongoingInsertOperationsCount === 0){
			this.nodesInTree.clear()
		}
	}

	markNodeInserted(node: Node): void {
		// no early-exit here
		// previous operation could remove part of subtree, so we need to put it back
		this.nodesInTree.add(node)
		for(let i = 0; i < node.childNodes.length; i++){
			this.markNodeInserted(node.childNodes[i]!)
		}
	}

	markNodeRemoved(node: Node): void {
		// again, no early-exit here, for same reason as insert
		this.nodesInTree.delete(node)

		for(let i = 0; i < node.childNodes.length; i++){
			this.markNodeRemoved(node.childNodes[i]!)
		}
	}

	isInserted(node: Node): boolean {
		return node.isConnected || this.nodesInTree.has(node)
	}

}