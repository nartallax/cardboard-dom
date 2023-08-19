import {RBox, WBox, box, viewBox} from "@nartallax/cardboard"
import {defineControl} from "src/control"
import {bindBox, onMount} from "src/functions/base_tag"
import {bindBoxToDom} from "src/functions/bind_box_to_dom"
import {containerTag, tag} from "src/functions/html_tag"
import {svgTag} from "src/functions/svg_tag"
import {mismatchedNodesErrorCount} from "src/parts/binder"
import {assertEquals, assertErrorTextMatches, assertFalsy, assertTruthy, sleep} from "test/test_utils"

export const testCases: {name: string, tester(): void | Promise<void>}[] = []

const selectedCase = ""

export function defineTestCase(name: string, tester: () => void | Promise<void>): void {
	if(!selectedCase || name === selectedCase){
		testCases.push({name, tester})
	}
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
	const key = "test-local-storage-value"
	try {
		const b = box({a: 5, b: 10})
		bindBoxToDom(b, {type: "localStorage", key})
		assertEquals(b.get().a, 5)
		assertEquals(localStorage.getItem(key), "{\"a\":5,\"b\":10}")
		b.set({a: 6, b: 15})
		assertEquals(localStorage.getItem(key), "{\"a\":6,\"b\":15}")
	} finally {
		localStorage.removeItem(key)
	}
})

defineTestCase("local storage box: loads value from local storage on creation", async() => {
	const key = "test-local-storage-value-2"
	try {
		localStorage.setItem(key, "\"ayaya\"")
		const b = box("owo")
		bindBoxToDom(b, {type: "localStorage", key})
		assertEquals(b.get(), "ayaya")
		b.set("uwu")
		assertEquals(localStorage.getItem(key), "\"uwu\"")
	} finally {
		localStorage.removeItem(key)
	}
})

defineTestCase("local storage box: sets value to local storage on creation", async() => {
	const key = "test-local-storage-value-2"
	try {
		localStorage.setItem(key, "\"ayaya\"")
		const b = box("owo")
		bindBoxToDom(b, {type: "localStorage", key, preferOriginalValue: true})
		assertEquals(b.get(), "owo")
		assertEquals(localStorage.getItem(key), "\"owo\"")
	} finally {
		localStorage.removeItem(key)
	}
})

defineTestCase("local storage box: sets value to local storage on creation if rbox", async() => {
	const key = "test-local-storage-value-2"
	try {
		localStorage.setItem(key, "\"ayaya\"")
		const a = box("owo")
		const b = a.map(x => x + x)
		bindBoxToDom(b, {type: "localStorage", key})
		assertEquals(b.get(), "owoowo")
		assertEquals(localStorage.getItem(key), "\"owoowo\"")
	} finally {
		localStorage.removeItem(key)
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

defineTestCase("remove node in beforeinsert", async() => {
	const b = tag()
	const cBox = box("owo")
	const c = tag([cBox])
	document.body.appendChild(c)
	onMount(b, () => c.remove(), {beforeInserted: true})
	document.body.appendChild(b)
	assertFalsy(c.isConnected)
	assertEquals(c.textContent, "owo")
	cBox.set("uwu")
	assertEquals(c.textContent, "owo")
	b.remove()
})

defineTestCase("insert a node in afterRemove", async() => {
	const b = tag(["b"])
	const cBox = box("owo")
	const c = tag([cBox])
	onMount(b, () => () => document.body.appendChild(c))
	document.body.appendChild(b)
	b.remove()
	assertTruthy(c.isConnected, "c.isConnected")
	assertEquals(c.textContent, "owo")
	cBox.set("uwu")
	assertEquals(c.textContent, "uwu")
	c.remove()
})

defineTestCase("live view slip: remove()", async() => {
	const a = tag()
	const b = tag()
	const cText = box("uwu")
	const c = tag([cText])
	const parent = tag([a, b, c])
	onMount(b, () => () => a.remove())
	await sleep(250)
	document.body.appendChild(parent)
	await sleep(250)
	parent.remove()
	assertEquals(c.textContent, "uwu")
	cText.set("owo")
	assertEquals(c.textContent, "uwu")
})

defineTestCase("live view slip: replace() on insert", async() => {
	const a = tag()
	const b = tag()
	const cText = box("uwu")
	const c = tag([cText])
	const d = tag(["ayaya"])
	const parent = tag([a, b, c])
	onMount(b, () => c.replaceWith(d))
	await sleep(250)
	document.body.appendChild(parent)
	await sleep(250)
	assertEquals(parent.textContent, "ayaya")
	parent.remove()
	assertEquals(c.textContent, "uwu")
	cText.set("owo")
	assertEquals(c.textContent, "uwu")
})

defineTestCase("live view slip: replace() on delete", async() => {
	const a = tag()
	const b = tag()
	const cText = box("uwu")
	const c = tag([cText])
	const d = tag(["ayaya"])
	const parent = tag([a, b, c])
	onMount(b, () => () => c.replaceWith(d))
	await sleep(250)
	document.body.appendChild(parent)
	await sleep(250)
	assertEquals(parent.textContent, "uwu")
	parent.remove()
	assertEquals(parent.textContent, "ayaya")
	assertEquals(c.textContent, "uwu")
	cText.set("owo")
	assertEquals(c.textContent, "uwu")
})

defineTestCase("child remove in unmounted state", async() => {
	const childData = box(["a", "aa", "aaa"])
	const parent = containerTag(childData, x => x.length, x => tag([x]))
	const parentParent = tag([parent])
	await sleep(250)
	document.body.appendChild(parentParent)
	assertEquals(parentParent.textContent, "aaaaaa")
	parentParent.remove()
	childData.set(["a", "aaa"])
	document.body.appendChild(parentParent)
	assertEquals(parentParent.textContent, "aaaa")
	await sleep(250)
	assertFalsy(mismatchedNodesErrorCount, "have nodes in bad state")
	parentParent.remove()
})

defineTestCase("onMount() in DOM: throw", () => {
	const a = tag()
	document.body.appendChild(a)
	let error: unknown = null
	try {
		onMount(a, () => {/* noop */})
	} catch(e){
		error = e
	}
	assertErrorTextMatches(error, /already in dom/i)
	a.remove()
})

defineTestCase("onMount() in DOM: nothing", () => {
	const a = tag()
	document.body.appendChild(a)
	let callCount = 0
	onMount(a, () => callCount++, {ifInDom: "nothing"})
	assertEquals(callCount, 0)
	a.remove()
})

defineTestCase("onMount() in DOM: call", () => {
	const a = tag()
	document.body.appendChild(a)
	let insertCallCount = 0
	let removeCallCount = 0
	onMount(a, () => {
		insertCallCount++
		return () => removeCallCount++
	}, {ifInDom: "call"})
	assertEquals(insertCallCount, 1)
	assertEquals(removeCallCount, 0)
	a.remove()
	assertEquals(insertCallCount, 1)
	assertEquals(removeCallCount, 1)
})