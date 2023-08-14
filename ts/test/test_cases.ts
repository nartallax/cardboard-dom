import {box} from "@nartallax/cardboard"
import {whileMounted} from "src/functions/base_tag"
import {containerTag, tag} from "src/functions/html_tag"
import {svgTag} from "src/functions/svg_tag"
import {localStorageBox} from "src/local_storage_box"

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
	const b = box("test1")
	let callsCount = 0
	const calcBox = b.map(a => {
		callsCount++
		return a + callsCount + "!"
	})

	const element = tag([calcBox])
	if(callsCount !== 1){
		throw new Error("Expected 1 call, got " + callsCount)
	}
	await sleep(250)
	document.body.appendChild(element)
	await sleep(250)

	b.set("test2")
	if(callsCount as unknown !== 2){ // uhh.
		throw new Error("Expected 2 calls, got " + callsCount)
	}

	await sleep(500)

	b.set("test3")
	if(callsCount as unknown !== 3){
		throw new Error("Expected 3 calls, got " + callsCount)
	}
	element.remove()
	if(callsCount as unknown !== 3){
		throw new Error("Expected 3 calls, got " + callsCount)
	}
	await sleep(250)
	if(callsCount as unknown !== 3){
		throw new Error("Expected 3 calls, got " + callsCount)
	}

	b.set("test4")
	if(callsCount as unknown !== 3){
		throw new Error("Expected 3 calls, got " + callsCount)
	}
})

defineTestCase("local storage box", async() => {
	const name = "test-local-storage-value"
	try {
		const b = localStorageBox(name, {a: 5, b: 10})
		if(b.get().a !== 5){
			throw new Error(`${b.get().a} !== 5`)
		}
		if(localStorage.getItem(name) !== null){
			throw new Error(`${localStorage.getItem(name)} !== null`)
		}
		b.set({a: 6, b: 15})
		if(localStorage.getItem(name) !== "{\"a\":6,\"b\":15}"){
			throw new Error(`${localStorage.getItem(name)} !== {"a":6,"b":15}`)
		}
	} finally {
		localStorage.removeItem(name)
	}
})

// TODO: revive, or delete
// defineTestCase("control wrapping", async() => {
// 	const defaults = {
// 		defaultOptProp: "uwu"
// 	}
// 	const Label = defineControl<{text: string, optProp?: number, defaultOptProp?: string}, typeof defaults>(defaults, (props, children) => {
// 		if(Math.random() < 0){
// 			console.log(props.defaultOptProp.get())
// 		}
// 		if(props.optProp?.get() === 3){
// 			console.log(props.optProp?.get())
// 		}
// 		if(!Array.isArray(children)){
// 			throw new Error("No children!")
// 		}
// 		return tag({class: "test-label"}, [props.text, ...children])
// 	})

// 	const labelA = Label({text: "uwu"})
// 	const b = box("owo")
// 	const labelB = Label({text: b})

// 	await sleep(250)

// 	document.body.appendChild(labelA)
// 	document.body.appendChild(labelB)

// 	if(labelA.textContent !== "uwu"){
// 		throw new Error("No uwu")
// 	}

// 	if(labelB.textContent !== "owo"){
// 		throw new Error("No owo")
// 	}

// 	b.set("ayaya")
// 	await sleep(250)
// 	if((labelB as HTMLElement).textContent !== "ayaya"){
// 		throw new Error("No ayaya (" + labelB.textContent + ")")
// 	}

// 	labelA.remove()
// 	labelB.remove()
// })

defineTestCase("null child among non-nulls", async() => {
	const childA = tag(["non-null child"])
	const childB = null
	const container = tag([childA, childB])
	await sleep(250)
	document.body.appendChild(container)
	if(!childA.isConnected){
		throw new Error("child A is not in DOM")
	}
	container.remove()
})

defineTestCase("tag don't invoke child map more times than needed", async() => {
	const data = box([1, 2, 3])
	let invokeCount = 0
	const container = containerTag(data, x => x, num => {
		invokeCount++
		return tag([num + ""])
	})

	await sleep(250)
	document.body.appendChild(container)
	await sleep(250)

	if(invokeCount !== 3){
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

// TODO: revive or delete
// defineTestCase("can omit props if they can be empty", async() => {
// 	const ctrl = defineControl<{opt?: string}>(props => {
// 		return tag([props.opt ?? "uwu"])
// 	})
// 	const el = ctrl()

// 	const defaults = {value: "owo"}
// 	const ctrl2 = defineControl<{value?: string}, typeof defaults>(defaults, props => tag([props.value]))
// 	const el2 = ctrl2()

// 	await sleep(250)
// 	document.body.appendChild(el)
// 	document.body.appendChild(el2)
// 	await sleep(250)

// 	const text = el.textContent
// 	if(text !== "uwu"){
// 		throw new Error("Wut...? " + text)
// 	}
// 	el.remove()

// 	const text2 = el2.textContent
// 	if(text2 !== "owo"){
// 		throw new Error("Wut...? " + text2)
// 	}
// 	el2.remove()
// })

defineTestCase("can assign number to attr/style", async() => {
	const owoBox = box(10)
	const container = tag({attrs: {"data-uwu": 5, "data-owo": owoBox}, style: {flexGrow: 1, flexShrink: box(1)}}, ["data-ayaya"])
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

	owoBox.set(15)
	{
		const attrVal = container.getAttribute("data-owo")
		if(attrVal !== "15"){
			throw new Error("Wut...? " + attrVal)
		}
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

// TODO: revive or delete
// defineTestCase("can pass boxed array of children to control without props", async() => {
// 	const Form = defineControl<Record<string, unknown>>((_, children) => {
// 		return tag({class: "form"}, children)
// 	})

// 	const b = box<HTMLElement[]>([])

// 	const form = Form(b)
// 	await sleep(250)
// 	document.body.appendChild(form)
// 	await sleep(250)
// 	b.set([tag({class: "this_is_form_field"}, ["This is form field!"])])
// 	await sleep(250)
// 	const formFieldFromQuery = document.querySelector(".this_is_form_field")
// 	if(!formFieldFromQuery){
// 		throw new Error("Children not updated")
// 	}

// 	form.remove()
// })

// TODO: revive this test
// defineTestCase("lora list rerendering when paramset is toggled", async() => {
// 	const loras = box<string[]>([])
// 	const paramSet = box<"a" | "b">("a")

// 	const LoraLabel = (b: WBox<string>) => tag({class: "lora"}, [b])
// 	const LoraList = (b: WBox<string[]>) => tag({class: "loralist"}, b.mapArray(el => LoraLabel(el)))
// 	const ParamList = (name: RBox<string>) => tag({class: "paramlist"}, name.map(name => {
// 		if(name === "a"){
// 			return []
// 		} else {
// 			return [LoraList(loras)]
// 		}
// 	}))

// 	loras.set(["some lora"])
// 	const list = ParamList(paramSet)
// 	await sleep(250)
// 	document.body.appendChild(list)
// 	await sleep(250)
// 	paramSet.set("b")
// 	loras.set([])
// 	await sleep(250)

// 	if(lastDomMutationError){
// 		throw lastDomMutationError
// 	}

// 	list.remove()
// })

defineTestCase("whileMounted", async() => {
	const text = box("uwu")

	const Label = () => {
		const result = tag()
		whileMounted(result, text, text => result.textContent = text)
		if(result.textContent !== "uwu"){
			throw new Error("Expected uwu, got " + result.textContent)
		}
		return result
	}

	const label = Label()
	await sleep(250)
	document.body.appendChild(label)
	await sleep(250)
	text.set("owo")
	await sleep(250)
	if(label.textContent !== "owo"){
		throw new Error("Expected owo, got " + label.textContent)
	}
	label.remove()
})
