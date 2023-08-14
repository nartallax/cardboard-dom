import {RBox, WBox, box, viewBox} from "@nartallax/cardboard"
import {defineControl} from "src/control"
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

defineTestCase("lora list rerendering when paramset is toggled", async() => {
	const loras = box<string[]>([])
	const paramSet = box<"a" | "b">("a")

	const LoraLabel = (b: RBox<string>) => tag({class: "lora"}, [b])
	const LoraList = (b: RBox<string[]>) => containerTag({class: "loralist"}, b, x => x, x => LoraLabel(x))
	const ParamList = (name: RBox<string>) => {
		const loraList = viewBox(() => name.get() === "a" ? [] : loras.get())
		return LoraList(loraList)
	}

	loras.set(["some lora"])
	const list = ParamList(paramSet)
	await sleep(250)
	document.body.appendChild(list)
	await sleep(250)
	paramSet.set("b")
	loras.set([])
	await sleep(250)

	list.remove()
})

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

defineTestCase("can define generic control", () => {
	const numericInput = defineControl(<T extends number>(props: {value: WBox<T>, defaultValue?: T}) => {
		const input = tag({tag: "input"})
		input.value = props.value.get() + ""
		return input
	})

	const inputA = numericInput({value: box<5>(5)})
	const inputB = numericInput({value: box(6)})

	// should not work: control does not accept children
	// const inputC = numericInput({value: box(6)}, [])
	// should not work: control has required arguments
	// const inputC = numericInput()

	if((inputA as any).value !== "5" || (inputB as any).value !== "6"){
		throw new Error("Bad value")
	}
})

defineTestCase("can define container-only control", () => {
	const container = defineControl((_: unknown, children) => {
		return tag(children)
	})

	const el = container(["uwu", "owo"])
	if(el.textContent !== "uwuowo"){
		throw new Error("Unexpected text content")
	}
})

defineTestCase("can define container-with-props control", () => {
	const container = defineControl((props: {type?: string}, children) => {
		return tag({attrs: {"data-type": props.type ?? "dflt-type"}}, children)
	})

	const a = container(["uwu"])
	const b = container({type: "owo"})
	const c = container({type: "ayaya"}, ["ayaya"])
	if(a.getAttribute("data-type") !== "dflt-type"
	|| a.textContent !== "uwu"
	|| b.getAttribute("data-type") !== "owo"
	|| c.getAttribute("data-type") !== "ayaya"
	|| c.textContent !== "ayaya"){
		throw new Error("Something borken uwu")
	}
})

defineTestCase("can define control without children and props", () => {
	const knob = defineControl(() => tag({class: "knob"}))
	const a = knob()
	if(a.className !== "knob"){
		throw new Error("Wrong classname")
	}
})

defineTestCase("containerTag updates by data", async() => {
	const a = {id: "a", name: "a"}
	const b = {id: "b", name: "b"}
	const c = {id: "c", name: "c"}
	const data = box([a, b, c])

	let count = 0
	const container = containerTag(
		data,
		item => item.id,
		item => tag({attrs: {"data-index": count++}}, [item.prop("name")])
	)
	await sleep(10)
	document.body.appendChild(container)

	function checkChildren(expected: [number, string][]): void {
		for(let i = 0; i < container.children.length; i++){
			const child = container.children[i]!
			const [index, text] = expected[i]!
			if(child.textContent !== text || child.getAttribute("data-index") !== index + ""){
				throw new Error(`Wrong child at ${i}: expected index=${index} and text=${text}, got index=${child.getAttribute("data-index")} and text=${child.textContent}`)
			}
		}
	}

	checkChildren([[0, "a"], [1, "b"], [2, "c"]])

	data.set([c, b, a])
	checkChildren([[2, "c"], [1, "b"], [0, "a"]])

	data.set([c, {...b, name: "bbb"}, a])
	checkChildren([[2, "c"], [1, "bbb"], [0, "a"]])

	data.set([c, a])
	checkChildren([[2, "c"], [0, "a"]])
	data.set([b, c, a])
	checkChildren([[3, "b"], [2, "c"], [0, "a"]])

	container.remove()
})

defineTestCase("containerTag passes wbox to a child", () => {
	const a = {id: "a", name: "a"}
	const b = {id: "b", name: "b"}
	const c = {id: "c", name: "c"}
	const data = box([a, b, c])

	const boxes: WBox<string>[] = []

	const container = containerTag(
		data,
		item => item.id,
		item => {
			const propBox = item.prop("name")
			boxes.push(propBox)
			return tag([propBox])
		}
	)
	document.body.appendChild(container)

	boxes[1]?.set("uwu")
	if(container.textContent !== "auwuc"){
		throw new Error("Wrong text")
	}

	container.remove()
})