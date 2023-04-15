import {WBox, box} from "@nartallax/cardboard"
import {nodeIsInDom} from "src/binder"
import {defineControl} from "src/control"
import {localStorageBox} from "src/local_storage_box"
import {tag} from "src/tag"

export const testCases: {name: string, tester(): void | Promise<void>}[] = []

function defineTestCase(name: string, tester: () => void | Promise<void>): void {
	testCases.push({name, tester})
}

function sleep(ms: number): Promise<void> {
	return new Promise(ok => setTimeout(ok, ms))
}

defineTestCase("waitDocumentLoaded", () => {
	// nothing. if you can see the test page - it's working
})

defineTestCase("update DOM when box changes", async() => {
	await new Promise(ok => setTimeout(ok, 500))
	// again, test render code will take care of that
})

defineTestCase("unsubscribe from box when element is removed from DOM", async() => {
	const b = box("test")
	let subCalls = 0
	let unsubCalls = 0

	const pseudoBox = function(x?: string): string {
		return x ? b(x) : b()
	} as unknown as WBox<string> & Record<string, unknown>

	pseudoBox.isRBox = true
	pseudoBox.isWBox = true
	pseudoBox.subscribe = (handler: (value: string) => void) => {
		subCalls++
		const unsub = b.subscribe(handler)
		return () => {
			unsubCalls++
			return unsub()
		}
	}

	const element = tag({style: {display: "none"}}, [pseudoBox])
	await sleep(250)
	document.body.appendChild(element)
	await sleep(500)
	element.remove()
	await sleep(1)
	if(subCalls !== 1 || unsubCalls !== 1){
		throw new Error("Wrong number of sub/unsub calls: " + subCalls + " and " + unsubCalls)
	}
})

defineTestCase("local storage box", async() => {
	const name = "test-local-storage-value"
	try {
		const box = localStorageBox(name, {a: 5, b: 10})
		if(box().a !== 5){
			throw new Error(`${box().a} !== 5`)
		}
		if(localStorage.getItem(name) !== null){
			throw new Error(`${localStorage.getItem(name)} !== null`)
		}
		box({a: 6, b: 15})
		if(localStorage.getItem(name) !== "{\"a\":6,\"b\":15}"){
			throw new Error(`${localStorage.getItem(name)} !== {"a":6,"b":15}`)
		}
	} finally {
		localStorage.removeItem(name)
	}
})

defineTestCase("control wrapping", async() => {
	const defaults = {
		defaultOptProp: "uwu"
	}
	const Label = defineControl<{text: string, optProp?: number, defaultOptProp?: string}, typeof defaults>(defaults, (props, children) => {
		if(Math.random() < 0){
			console.log(props.defaultOptProp())
		}
		if(props.optProp?.() === 3){
			console.log(props.optProp?.())
		}
		if(!Array.isArray(children)){
			throw new Error("No children!")
		}
		return tag({class: "test-label"}, [props.text, ...children])
	})

	const labelA = Label({text: "uwu"})
	const b = box("owo")
	const labelB = Label({text: b})

	await sleep(250)

	document.body.appendChild(labelA)
	document.body.appendChild(labelB)

	if(labelA.textContent !== "uwu"){
		throw new Error("No uwu")
	}

	if(labelB.textContent !== "owo"){
		throw new Error("No owo")
	}

	b("ayaya")
	await sleep(250)
	if((labelB as HTMLElement).textContent !== "ayaya"){
		throw new Error("No ayaya (" + labelB.textContent + ")")
	}

	labelA.remove()
	labelB.remove()
})

defineTestCase("null child among non-nulls", async() => {
	const childA = tag(["non-null child"])
	const childB = null
	const container = tag([childA, childB])
	await sleep(250)
	document.body.appendChild(container)
	if(!nodeIsInDom(childA)){
		throw new Error("child A is not in DOM")
	}
	container.remove()
})

defineTestCase("tag don't invoke child map more times than needed", async() => {
	const data = box([1, 2, 3])
	let invokeCount = 0
	const container = tag(data.map(src => {
		invokeCount++
		return src.map(num => tag([num + ""]))
	}))

	await sleep(250)
	document.body.appendChild(container)
	await sleep(250)

	if(invokeCount !== 1){
		throw new Error("Too many mapper calls: " + invokeCount)
	}
	container.remove()
})