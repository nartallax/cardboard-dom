/** Monkeypatch DOM methods and properties to synchronously call handlers on insert and remove
 * Exists because MutationObserver is asynchronous, and there's no hope for synchronous version in sight
 *
 * afterRemoveOrInsert is like that because insertion can remove node from DOM if inserting into detached node
 *
 * beforeInsert and afterRemoveOrInsert are called when node potentially could be inserted or removed,
 * and do not guarantee that they actually are.
 * In some cases they'd be wrong; additional checking is required.
 * (also weird stuff could happen in replace-methods and such)
 *
 * Will call handlers only for top-level inserted/removed nodes (i.e. won't iterate their children to call handlers)
 * Won't call beforeInsert in case of nodes created on-fly when HTML text is changed (by innerHTML, outerHTML, setHTML()) */
export function monkeyPatchDomForInsertRemove(beforeInsert: (node: Node, parent: Node) => void, afterRemoveOrInsert: (node: Node) => void): void {

	knownPatchedFunctions = new Set()

	const beforeInsertIfNode = (x: unknown, parent: Node) => {
		if(x instanceof Node){
			beforeInsert(x, parent)
		}
	}

	const onNodeListAttaching = (original: any) => function(this: Node, ...args: unknown[]): void {
		for(let i = 0; i < args.length; i++){
			beforeInsertIfNode(args[i]!, this)
		}
		const result = original.apply(this, args)
		for(let i = 0; i < args.length; i++){
			const child = args[i]
			if(child instanceof Node){
				afterRemoveOrInsert(child)
			}
		}
		return result
	}

	const onSingleNodeInsert = (original: any) => function(this: Node, ...args: any[]): any {
		beforeInsert(args[0]!, this)
		const result = original.apply(this, args)
		afterRemoveOrInsert(args[0]!)
		return result
	}

	monkeyPatchMethod("insertBefore", onSingleNodeInsert)
	monkeyPatchMethod("after", onSingleNodeInsert)
	monkeyPatchMethod("before", onSingleNodeInsert)
	monkeyPatchMethod("appendChild", onSingleNodeInsert)
	monkeyPatchMethod("append", onNodeListAttaching)
	monkeyPatchMethod("prepend", onNodeListAttaching)
	monkeyPatchMethod("insertAdjacentElement", original => function(this: Node, ...args: any[]) {
		beforeInsert(args[1]!, this)
		const result = original.apply(this, args)
		afterRemoveOrInsert(args[1]!)
		return result
	})
	// there's also insertAdjacentText and insertAdjacentHTML
	// but for purposes of this library I don't need to do anything about them

	monkeyPatchMethodAfter("removeChild", afterRemoveOrInsert)
	monkeyPatchMethodAfter("remove", function(this: Element) {
		afterRemoveOrInsert(this)
	})

	monkeyPatchMethod("replaceChild", original => function(this: Node, ...args: Node[]) {
		beforeInsert(args[0]!, this)
		const result = original.apply(this, args)
		afterRemoveOrInsert(args[1]!)
		afterRemoveOrInsert(args[0]!)
		return result
	})

	monkeyPatchMethod("replaceChildren", original => function(this: Element, ...args: any[]): any {
		const oldChildren = copyArrayLike(this.childNodes)
		for(let i = 0; i < args.length; i++){
			beforeInsertIfNode(args[i], this)
		}
		const result = original.apply(this, args)
		for(let i = 0; i < oldChildren.length; i++){
			afterRemoveOrInsert(oldChildren[i]!)
		}
		for(let i = 0; i < args.length; i++){
			afterRemoveOrInsert(args[i]!)
		}
		return result
	})

	monkeyPatchMethod("replaceWith", original => function(this: Element, ...args: any[]): any {
		for(let i = 0; i < args.length; i++){
			beforeInsertIfNode(args[i], this)
		}
		const result = original.apply(this, args)
		afterRemoveOrInsert(this)
		for(let i = 0; i < args.length; i++){
			afterRemoveOrInsert(args[i])
		}
		return result
	})

	monkeyPatchMethod("setHTML", original => function(this: Element, ...args: any[]): any {
		const oldChildren = copyArrayLike(this.childNodes)
		const result = original.apply(this, args)
		for(let i = 0; i < oldChildren.length; i++){
			afterRemoveOrInsert(oldChildren[i]!)
		}
		return result
	})

	monkeyPatchSetter("innerHTML", original => function(this: Element, ...args: any[]) {
		const oldChildren = copyArrayLike(this.childNodes)
		// here we can't call beforeInsert, because there are no elements before insert, they are created in process
		// but for use-case of this library it's fine
		// it will never need freshly-created elements anyway, because no handles can exist for them yet
		// (the same goes for other html-changing methods and props)
		const result = original.apply(this, args as any)
		for(let i = 0; i < oldChildren.length; i++){
			afterRemoveOrInsert(oldChildren[i]!)
		}
		return result
	})

	monkeyPatchSetter("outerHTML", original => function(this: Element, ...args: any[]) {
		const result = original.apply(this, args as any)
		afterRemoveOrInsert(this)
		return result
	})

	monkeyPatchSetter("textContent", original => function(this: Element, ...args: any[]) {
		const oldChildren = copyArrayLike(this.childNodes)
		const result = original.apply(this, args as any)
		for(let i = 0; i < oldChildren.length; i++){
			afterRemoveOrInsert(oldChildren[i]!)
		}
		return result
	})

	knownPatchedFunctions = null

}

/** Those are all classes we potentially may want to patch
 * this file is organized that way because I'm afraid that some browsers will define some methods/properties in non-standard way
 * for now it's mostly in the past, but a nice robustness touch anyway */
const patchableClasses = [Node, Element, HTMLElement, SVGElement]

let knownPatchedFunctions: Set<any> | null = null

function copyArrayLike<T>(src: ArrayLike<T>): T[] {
	const result: T[] = new Array(src.length)
	for(let i = 0; i < src.length; i++){
		result[i] = src[i]!
	}
	return result
}

function monkeyPatchMethodAfter(name: string, patch: (...args: any) => void): void {
	monkeyPatchMethod(name, original => function(this: any, ...args: any[]): any {
		const result = original.apply(this, args)
		patch.apply(this, args as any)
		return result
	})
}

function monkeyPatchMethod(
	name: string, makePatch: (original: any) => any
): void {
	for(const cls of patchableClasses){
		const original = (cls.prototype as any)[name]
		if(typeof(original) !== "function" || knownPatchedFunctions?.has(original)){
			continue
		}
		try {
			const patchedMethod = makePatch(original)
			knownPatchedFunctions?.add(patchedMethod);
			// for testing purposes
			(patchedMethod as any).originalNonPatchedMethod = original;
			(cls.prototype as any)[name] = patchedMethod
		} catch(e){
			console.error("Failed to monkeypatch " + name + " method on " + cls.name + ": " + e)
		}
	}

}

function monkeyPatchSetter(name: string, makePatch: (original: any) => any): void {
	for(const cls of patchableClasses){
		try {
			const originalProp = Object.getOwnPropertyDescriptor(cls.prototype, name)
			if(!originalProp || typeof(originalProp.set) !== "function" || knownPatchedFunctions?.has(originalProp.set)){
				continue
			}
			const patchedSetter = makePatch(originalProp.set)
			knownPatchedFunctions?.add(patchedSetter)
			Object.defineProperty(cls.prototype, name, {
				...originalProp,
				set: patchedSetter
			})
		} catch(e){
			console.error("Failed to monkeypatch " + name + " property on " + cls.name + ": " + e)
		}
	}
}