import {Binder} from "src/parts/binder"

/** A wrap around MutationObserver
 * exists to check after monkeypatched DOM nodes
 * (we should emit error if observer's state is not consistent with monkeypatched state) */
export class AsyncMutationWatcher {
	private observer: MutationObserver | null = null

	constructor(private readonly binders: WeakMap<Node, Binder>) {}

	init(): void {
		if(!this.observer && typeof(MutationObserver) !== "undefined"){
			this.observer = new MutationObserver(this.doWithRecords.bind(this))
			this.observer.observe(document.body, {childList: true, subtree: true})
		}
	}

	shutdown(): void {
		if(this.observer){
			this.observer.disconnect()
			this.observer = null
		}
	}

	private collectEligibleNodesFromArray(nodes: Node[]): Set<Node> {
		const result = new Set<Node>()
		for(let i = 0; i < nodes.length; i++){
			this.collectEligibleNodes(nodes[i]!, result)
		}
		return result
	}

	private collectEligibleNodes(node: Node, result: Set<Node>): void {
		if(this.binders.has(node)){
			result.add(node)
		}
		const children = node.childNodes
		for(let i = 0; i < children.length; i++){
			this.collectEligibleNodes(children[i]!, result)
		}
	}

	private doWithRecords(records: MutationRecord[]): void {
		const addedNodesArr = [] as Node[]
		const removedNodesArr = [] as Node[]
		for(let i = 0; i < records.length; i++){
			const record = records[i]!
			for(let j = 0; j < record.addedNodes.length; j++){
				addedNodesArr.push(record.addedNodes[j]!)
			}
			for(let j = 0; j < record.removedNodes.length; j++){
				removedNodesArr.push(record.removedNodes[j]!)
			}
		}

		const addedNodes = this.collectEligibleNodesFromArray(addedNodesArr)
		const removedNodes = this.collectEligibleNodesFromArray(removedNodesArr)

		for(const node of addedNodes){
			if(removedNodes.has(node)){
				continue
			}
			this.binders.get(node)!.notifyAttachmentState(true)
		}

		for(const node of removedNodes){
			if(addedNodes.has(node)){
				continue
			}
			this.binders.get(node)!.notifyAttachmentState(false)
		}
	}
}