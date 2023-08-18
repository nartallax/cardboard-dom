import {RBox, WBox, box, viewBox} from "@nartallax/cardboard"
import {defineControl} from "src/control"
import {bindBox} from "src/functions/base_tag"
import {containerTag, tag} from "src/functions/html_tag"
import {svgTag} from "src/functions/svg_tag"
import {localStorageBox} from "src/local_storage_box"
import {assertEquals, assertTruthy, sleep} from "test/test_utils"

export const testCases: {name: string, tester(): void | Promise<void>}[] = []

export function defineTestCase(name: string, tester: () => void | Promise<void>): void {
	testCases.push({name, tester})
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
	assertEquals(callsCount, 1)
	await sleep(250)
	document.body.appendChild(element)
	await sleep(250)

	b.set("test2")
	assertEquals(callsCount, 2)

	await sleep(500)

	b.set("test3")
	assertEquals(callsCount, 3)
	element.remove()
	assertEquals(callsCount, 3)
	await sleep(250)
	assertEquals(callsCount, 3)

	b.set("test4")
	assertEquals(callsCount, 3)
})

defineTestCase("local storage box", async() => {
	const name = "test-local-storage-value"
	try {
		const b = localStorageBox(name, {a: 5, b: 10})
		assertEquals(b.get().a, 5)
		assertEquals(localStorage.getItem(name), null)
		b.set({a: 6, b: 15})
		assertEquals(localStorage.getItem(name), "{\"a\":6,\"b\":15}")
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
	assertTruthy(childA.isConnected, "child A is not in DOM")
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

	assertEquals(invokeCount, 3)
	container.remove()
})

defineTestCase("can assign undefined to attr", async() => {
	const container = tag({attrs: {"data-uwu": undefined}}, ["data-uwu"])
	await sleep(250)
	document.body.appendChild(container)
	await sleep(250)

	const attrVal = container.getAttribute("data-uwu")
	assertEquals(attrVal, null)
	container.remove()
})

defineTestCase("can assign null to attr", async() => {
	const container = tag({attrs: {"data-uwuwu": null}}, ["data-uwuwu"])
	await sleep(250)
	document.body.appendChild(container)
	await sleep(250)

	const attrVal = container.getAttribute("data-uwu")
	assertEquals(attrVal, null)
	container.remove()
})

defineTestCase("can pass a box of null as child", async() => {
	const boxOfNull = box(null)
	const container = tag({class: "null-box-child-test"}, [boxOfNull])
	await sleep(250)
	document.body.appendChild(container)
	await sleep(250)

	const text = container.textContent
	assertEquals(text, "")
	container.remove()
})

defineTestCase("can assign number to attr/style", async() => {
	const owoBox = box(10)
	const container = tag({attrs: {"data-uwu": 5, "data-owo": owoBox}, style: {flexGrow: 1, flexShrink: box(1)}}, ["data-ayaya"])
	await sleep(250)
	document.body.appendChild(container)
	await sleep(250)

	assertEquals(container.getAttribute("data-uwu"), "5")
	assertEquals(container.getAttribute("data-owo"), "10")
	assertEquals(container.style.flexGrow, "1")
	assertEquals(container.style.flexShrink, "1")

	owoBox.set(15)
	assertEquals(container.getAttribute("data-owo"), "15")

	container.remove()
})

defineTestCase("can pass svg as child of div", async() => {
	const svg = svgTag({tag: "svg"}, [svgTag({tag: "path", attrs: {d: "M150 0 L75 200 L225 200 Z"}})])
	const container = tag([svg])
	await sleep(250)
	document.body.appendChild(container)
	await sleep(250)

	const svgFromSearch = container.querySelector("svg")
	assertTruthy(svgFromSearch)

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
		bindBox(result, text, text => result.textContent = text)
		assertEquals(result.textContent, "uwu")
		return result
	}

	const label = Label()
	await sleep(250)
	document.body.appendChild(label)
	await sleep(250)
	text.set("owo")
	await sleep(250)
	assertEquals(label.textContent, "owo")
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

	assertEquals((inputA as any).value, "5")
	assertEquals((inputB as any).value, "6")
})

defineTestCase("can define container-only control", () => {
	const container = defineControl((_: unknown, children) => {
		return tag(children)
	})

	const el = container(["uwu", "owo"])
	assertEquals(el.textContent, "uwuowo")
})

defineTestCase("can define container-with-props control", () => {
	const container = defineControl((props: {type?: string}, children) => {
		return tag({attrs: {"data-type": props.type ?? "dflt-type"}}, children)
	})

	const a = container(["uwu"])
	const b = container({type: "owo"})
	const c = container({type: "ayaya"}, ["ayaya"])
	assertEquals(a.getAttribute("data-type"), "dflt-type")
	assertEquals(a.textContent, "uwu")
	assertEquals(b.getAttribute("data-type"), "owo")
	assertEquals(c.getAttribute("data-type"), "ayaya")
	assertEquals(c.textContent, "ayaya")
})

defineTestCase("can define control without children and props", () => {
	const knob = defineControl(() => tag({class: "knob"}))
	const a = knob()
	assertEquals(a.className, "knob")
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
			assertEquals(child.textContent, text)
			assertEquals(child.getAttribute("data-index"), index + "")
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
	assertEquals(container.textContent, "auwuc")

	container.remove()
})

defineTestCase("monkeypatching subs", () => {

	const parent = tag()
	document.body.appendChild(parent)

	const b = box("uwu")
	const child = tag([b])

	const makeChecker = (fn: unknown) => (a: unknown, b: unknown) => {
		if(a !== b){
			throw new Error(`Check for ${fn} failed: ${a} !== ${b}`)
		}
	}

	function expectSub(cb: () => void): void {
		const check = makeChecker(cb)
		const oldElText = child.textContent
		const oldBoxText = b.get()
		check(oldBoxText, oldElText)

		b.set(oldBoxText + oldBoxText)
		check(child.textContent, oldBoxText)

		cb()
		check(child.textContent, oldBoxText + oldBoxText)

		b.set(oldBoxText)
		check(child.textContent, oldBoxText)

		parent.replaceChildren() // remove everything

		b.set(oldBoxText + oldBoxText)
		check(child.textContent, oldBoxText)

		b.set(oldBoxText)
	}

	expectSub(() => parent.appendChild(child))
	expectSub(() => {
		const anotherChild = tag()
		parent.appendChild(anotherChild)
		parent.replaceChild(child, anotherChild)
	})
	expectSub(() => parent.append(child))
	expectSub(() => parent.prepend(child))
	expectSub(() => {
		const anotherChild = tag()
		parent.appendChild(anotherChild)
		parent.insertBefore(child, anotherChild)
	})
	expectSub(() => {
		const anotherChild = tag()
		parent.appendChild(anotherChild)
		anotherChild.replaceWith(child)
	})
	expectSub(() => {
		const anotherChild = tag()
		parent.appendChild(anotherChild)
		anotherChild.insertAdjacentElement("afterend", child)
	})
	expectSub(() => {
		const anotherChild = tag()
		parent.appendChild(anotherChild)
		anotherChild.after(child)
	})
	expectSub(() => {
		const anotherChild = tag()
		parent.appendChild(anotherChild)
		anotherChild.before(child)
	})
	expectSub(() => parent.replaceChildren(child))
})

defineTestCase("monkeypatching unsubs", () => {
	const parent = tag()
	document.body.appendChild(parent)

	const b = box("uwu")
	const child = tag([b])
	parent.appendChild(child)

	const makeChecker = (fn: unknown) => {
		let count = 0
		return (a: unknown, b: unknown) => {
			count++
			if(a !== b){
				throw new Error(`${count}th check for ${fn} failed: ${a} !== ${b}`)
			}
		}
	}

	function expectUnsub(cb: () => void): void {
		const check = makeChecker(cb)
		const oldElText = child.textContent
		const oldBoxText = b.get()
		check(oldBoxText, oldElText)

		b.set(oldBoxText + oldBoxText)
		check(child.textContent, oldBoxText + oldBoxText)

		cb()
		check(child.textContent, oldBoxText + oldBoxText)

		b.set(oldBoxText)
		check(child.textContent, oldBoxText + oldBoxText)

		document.body.appendChild(parent)
		parent.replaceChildren(child) // remove everything

		check(child.textContent, oldBoxText)
		b.set(oldBoxText + oldBoxText)
		check(child.textContent, oldBoxText + oldBoxText)

		b.set(oldBoxText)
		check(child.textContent, oldBoxText)
	}

	expectUnsub(() => parent.removeChild(child))
	expectUnsub(() => child.remove())
	expectUnsub(() => {
		const anotherChild = tag()
		child.replaceWith(anotherChild)
	})
	expectUnsub(() => parent.replaceChildren())
	expectUnsub(() => {
		const anotherChild = tag()
		parent.replaceChild(anotherChild, child)
	})
	expectUnsub(() => (parent as any).setHTML(""))
	expectUnsub(() => parent.innerHTML = "")
	expectUnsub(() => parent.textContent = "")
	expectUnsub(() => parent.outerHTML = "")

	parent.remove()
})

// defineTestCase("remove node in beforeinsert", async() => {
// 	const b = tag()
// 	const cBox = box("owo")
// 	const c = tag([cBox])
// 	document.body.appendChild(c)
// 	onMount(b, () => c.remove(), {beforeInserted: true})
// 	document.body.appendChild(b)
// })