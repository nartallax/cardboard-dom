import {BinderImpl} from "src/binder"
import {NodeDataAttacher} from "src/node_data_attacher"

// for tests mostly
export let lastDomMutationError: Error | null = null

export class DomMutationHandler {
	private observer: MutationObserver | null = null

	constructor(private readonly binders: NodeDataAttacher<BinderImpl>) {}

	init(): void {
		if(!this.observer){
			this.observer = new MutationObserver(this.doWithRecords.bind(this))
			this.observer.observe(document.body, {childList: true, subtree: true})
		}
	}

	private collectEligibleNodes(nodes: Node[]): Set<Node> {
		const result = new Set<Node>()
		while(true){
			const node = nodes.pop()
			if(!node){
				break
			}
			if(this.binders.has(node)){
				result.add(node)
			}
			const children = node.childNodes
			for(let i = 0; i < children.length; i++){
				nodes.push(children[i]!)
			}
		}
		return result
	}

	private doWithRecords(records: MutationRecord[]): void {
		try {
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

			const addedNodes = this.collectEligibleNodes(addedNodesArr)
			const removedNodes = this.collectEligibleNodes(removedNodesArr)

			// console.log("add: " + [...addedNodes].map(node => (node as HTMLElement).outerHTML).join("\n"))
			// console.log("remove: " + [...removedNodes].map(node => (node as HTMLElement).outerHTML).join("\n"))

			// TODO: can optimise here maybe? to not check twice for nodes that was both inserted and removed
			// also this whole algo feels slow
			for(const node of addedNodes){
				if(removedNodes.has(node)){
					continue
				}
				this.binders.get(node)!.fireNodeInserted()
			}

			for(const node of removedNodes){
				if(addedNodes.has(node)){
					continue
				}
				this.binders.get(node)!.fireNodeRemoved()
			}
		} catch(e){
			if(e instanceof Error){
				lastDomMutationError = e
			}
			throw e
		}
	}
}