# Cardboard DOM

A way to link [Cardboard](https://github.com/nartallax/cardboard) boxes to DOM.  

## Install

```bash
npm install @nartallax/cardboard
npm install @nartallax/cardboard-dom
```

Note that `@nartallax/cardboard` is a peer dependency and must be installed first.  

## Usage: rendering DOM elements

First function you need to know of is `tag`.  
`tag` creates an HTML element with parameters you provide:

```typescript
import {tag, initializeCardboardDom} from "@nartallax/cardboard-dom"

// this function MUST be called before any DOM manipulation
// (in later examples this call is omitted)
await initializeCardboardDom()

const root = tag({class: "root-container"}, [
	tag({tag: "h1"}, ["Hello world!"]),
	"Lorem ipsum or smth",
	tag({
		tag: "button",
		attrs: {value: "Click me!"},
		onClick: () => console.log("clicked!")
	})
])

// after that, you may do whatever you want with the element
document.body.append(root)
```

## Using boxes: general idea

Now to the main feature of this library - how to subscribe to a box without making memory leak.  
This library allows you to bind box to an DOM node. When the node is inserted into DOM - library will subscribe to the box; when the node is removed - library will unsubscribe. This way a box is never subscribed to unless it can actually do something with DOM.  
For this exact purpose `bindBox` function exists:

```typescript
import {tag, bindBox} from "@nartallax/cardboard-dom"
import {box} from "@nartallax/cardboard"

let nameBox = box("Alice")
let nameEl = tag()

let handler = (name: string) => nameEl.setAttribute("data-name", name)
// this binds the nameBox to nameEl.
// callback will be executed immediately, and also each time the box is inserted into DOM.
bindBox(nameEl, nameBox, handler)

// you can unbind box later if you don't need it anymore, but that's optional
// (nothing bad will happen if you won't do it)
// note that this will unbind all the boxes that use that handler
unbindBox(nameEl, handler)
```

Subscribing to boxes directly (like, with `.subscribe()` method) is still an option, but you will almost never really need it. Direct call of `.subscribe()` should be avoided, as it is the way to create an accidental memory leak.

## Using boxes: shortcuts

But that's a bit tedious, to bind each individual box.  
Fortunately, `tag` allows you to pass boxes in place of most values:  

```typescript
import {tag} from "@nartallax/cardboard-dom"
import {box} from "@nartallax/cardboard"

let nameBox = box("Bob")
let colorBox = box("#00f")
let classNameBox = box("name-label")
let isHighlightedBox = box(false)
let nameEl = tag({
	// you can pass a box as attribute value
	attrs: {"data-name": nameBox},
	// you can pass box as style value
	style: {backgroundColor: colorBox},
	// you can also pass boxes as parts of class name
	class: ["some-label", classNameBox, {highlighted: isHighlightedBox}]
	// ... and other stuff
}, 
// you can also pass box as a child; a text node with the content of the box will be created
// ...but you cannot pass box with a DOM node this way
["The name is: ", nameBox])
```

Passing box in place of value is equivalent to passing just value, and then binding a box to that element and updating value in the callback. So it's pretty intuitive - if you pass a box, `tag` will handle binding for you.  

As it says above, you cannot pass a box containing an `HTMLElement` as child to `tag`.  
This is a design choice; boxes exist to store data, and `HTMLElement` is a product of processing that boxed data into something that you can show to the user. It is extension of original [Cardboard rule](https://github.com/nartallax/cardboard#antipatterns) "don't put box into box".  

## Container tags: arrays

Working with arrays is hard.  
Fortunately, this library has a solution for that - container tags:  

```typescript
import {tag, containerTag} from "@nartallax/cardboard-dom"
import {box} from "@nartallax/cardboard"

let students = box([
	{name: "Alice", id: 1}, 
	{name: "Bob", id: 5}, 
	{name: "Cody", id: 2}
])
let el = containerTag(
	// tag definition, just like with `tag` (that's optional)
	{class: "student-container"},
	// a box with array of something
	students,
	// `getKey` callback. you should return stable keys from this function
	student => student.id,
	// `render` callback. this callback receives box with an element of the array,
	// and supposed to return an HTMLElement
	studentBox => tag({
		class: "student-line", 
		attrs: {"data-student-id": studentBox.prop("id")}
	}, ["Student: ", studentBox.prop("name")])
)

// and then you have your container tag
// it will update its own children when original array box changes its value
document.body.append(el)
```

## Container tags: individual boxes

There's another use of `containerTag` function, and that's a way to transform a box (or several) into DOM nodes:

```typescript
import {tag, containerTag} from "@nartallax/cardboard-dom"
import {box} from "@nartallax/cardboard"

let nameBox = box("Dan")
let ageBox = box(143)

// you can also have description, with class names and such,
// and only one box instead of array if you want
let el = containerTag([nameBox, ageBox], (name, age) => tag([`This is ${name}, aged ${age}`]))
```

Note that this is rare case. Usually you want to do that without container tags, because each change of any of the box values will lead to creation of fresh DOM nodes.  
It's inavoidable sometimes; for example, if you have a router - it's perfectly reasonable to render new page from scratch when page address changes.  

## Controls

Controls (also called components in other UI frameworks) are a way to organise your code.  
They are totally optional, you can just render everything in your `main()` function, but that's not very nice, is it?  

Basic way to define a control is to just make a function. Usually first argument of that function is an object with properties, and second argument is array of children, if you expect them to be passed (but that's not enforced):  

```typescript
import {tag} from "@nartallax/cardboard-dom"
import {MRBox} from "@nartallax/cardboard"

interface ButtonProps {
	label?: MRBox<string>
	onClick?: () => void
}

export const Button = (props: ButtonProps, otherChildren?: HTMLElement[]) => {
	return tag({
		tag: "button",
		class: "my-custom-button"
		onClick: props.onClick
	}, [
		props.label,
		...(otherChildren ?? [])
	])
}

let myButton = Button({label: "uwu", onClick: () => console.log("uwu!")})
```

In example above, all properties are optional (they shouldn't be in real life, but for sake of example they are). So, naturally, sometimes you may want to not pass them at all. But that's not something you could do with just a function; you will need to define overrides, then resolve arguments in actual function... that's tedious.  
Fortunately, there's a function that will do just that for you: `defineControl`:  

```typescript
export const Button = defineControl((props: ButtonProps, otherChildren) => {
	// otherChildren here are not merely `HTMLElement[]`, but `HTMLChildArray`
	// this allows user to pass strings, boxes of strings, nulls, undefineds, numbers...
	// you are expected to pass children to `tag` anyway, and make it handle everything

	/* All the same here as in example above */
})

let myButton = Button() // look, no props!
```

## Using boxes: other DOM values

There are other values in DOM that are not (always) bound to elements you can render: page location, local storage, CSS variables.  
To interface with them, an overload of `bindBox` exists:

```typescript
import {bindBox} from "@nartallax/cardboard-dom"
import {box} from "@nartallax/cardboard"

let pathBox = box("")

bindBox(
	// as ususal, any box requires an element to be bound to:
	document.body,
	// the box we're binding
	pathBox, 
	// description of what to bind this box to
	{
		// there are other types, make sure to check out the typings
		type: "url", 
		// we only need path, so we ask for path:
		path: true
	}
)

console.log(pathBox.get()) // it's "/" if you're in the root of the page

// you can also set it, and changes will be propagated to location:
pathBox.set("/path/to/some/page")
console.log(window.location + "") // http://localhost/path/to/some/page
```

There is a shortcut that will create a box for you (not only for location binding, for other DOM values too):

```typescript
import {urlBox} from "@nartallax/cardboard-dom"

const pathBox = urlBox(document.body, {path: true})
```

## Handling DOM insertion/removal

If you need to do something smart with DOM nodes, that will require you to wait for adding/removing node from DOM - you can use `onMount` function:

```typescript
import {tag, onMount} from "@nartallax/cardboard-dom"

let el = tag()

onMount(el, () => {
	console.log("Hey, the element was inserted into DOM:", el)
	// returning a function is optional
	return () => {
		console.log("Hey, the element was removed from DOM:", el)
	}
})
```
