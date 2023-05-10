import {WBox, box} from "@nartallax/cardboard"
import {nodeIsInDom} from "src/binder"
import {defineControl} from "src/control"
import {localStorageBox} from "src/local_storage_box"
import {svgTag, tag} from "src/tag"

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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(pseudoBox as any).isRBox = true;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(pseudoBox as any).isWBox = true
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

defineTestCase("can assign undefined to attr", async() => {
	const container = tag({attrs: {"data-uwu": undefined}}, ["data-uwu"])
	await sleep(250)
	document.body.appendChild(container)
	await sleep(250)

	const attrVal = container.getAttribute("data-uwu")
	if(attrVal !== null){
		throw new Error("Wut...? " + attrVal)
	}
	container.remove()
})

defineTestCase("can pass a box of null as child", async() => {
	const boxOfNull = box(null)
	const container = tag({class: "null-box-child-test"}, [boxOfNull])
	await sleep(250)
	document.body.appendChild(container)
	await sleep(250)

	const text = container.textContent
	if(text){
		throw new Error("Wut...? " + text)
	}
	container.remove()
})

defineTestCase("can omit props if they can be empty", async() => {
	const ctrl = defineControl<{opt?: string}>(props => {
		return tag([props.opt ?? "uwu"])
	})
	const el = ctrl()

	const defaults = {value: "owo"}
	const ctrl2 = defineControl<{value?: string}, typeof defaults>(defaults, props => tag([props.value]))
	const el2 = ctrl2()

	await sleep(250)
	document.body.appendChild(el)
	document.body.appendChild(el2)
	await sleep(250)

	const text = el.textContent
	if(text !== "uwu"){
		throw new Error("Wut...? " + text)
	}
	el.remove()

	const text2 = el2.textContent
	if(text2 !== "owo"){
		throw new Error("Wut...? " + text2)
	}
	el2.remove()
})

defineTestCase("can assign number to attr/style", async() => {
	const container = tag({attrs: {"data-uwu": 5, "data-owo": box(10)}, style: {flexGrow: 1, flexShrink: box(1)}}, ["data-ayaya"])
	await sleep(250)
	document.body.appendChild(container)
	await sleep(250)

	{
		const attrVal = container.getAttribute("data-uwu")
		if(attrVal !== "5"){
			throw new Error("Wut...? " + attrVal)
		}
	}

	{
		const attrVal = container.getAttribute("data-owo")
		if(attrVal !== "10"){
			throw new Error("Wut...? " + attrVal)
		}
	}

	{
		const styleVal = container.style.flexGrow
		if(styleVal !== "1"){
			throw new Error("Wut...? " + styleVal)
		}
	}

	{
		const styleVal = container.style.flexShrink
		if(styleVal !== "1"){
			throw new Error("Wut...? " + styleVal)
		}
	}


	container.remove()
})

defineTestCase("can pass result of mapArray as tag children", async() => {
	const b = box(["nyom nyom"])
	const container = tag(b.mapArray(() => 1, str => tag([str])))
	await sleep(250)
	document.body.appendChild(container)
	await sleep(250)

	const text = container.textContent
	if(text !== "nyom nyom"){
		throw new Error("Wut...? " + text)
	}

	b(["nyom nyom nyom"])
	await sleep(250)

	const text2 = container.textContent
	if(text2 !== "nyom nyom nyom"){
		throw new Error("Wut...? " + text)
	}

	container.remove()
})

defineTestCase("can pass svg as child of div", async() => {
	const svg = svgTag({tag: "svg"}, [svgTag({tag: "path", attrs: {d: "M150 0 L75 200 L225 200 Z"}})])
	const container = tag([svg])
	await sleep(250)
	document.body.appendChild(container)
	await sleep(250)

	const svgFromSearch = container.querySelector("svg")
	if(!svgFromSearch){
		throw new Error("No svg")
	}

	container.remove()
})