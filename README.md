# Cardboard DOM

Utils for [Cardboard](https://github.com/nartallax/cardboard).  
It will be hard to write a website without them.  

## Install

```bash
npm install @nartallax/cardboard
npm install @nartallax/cardboard-dom
```

Note that `@nartallax/cardboard` is a peer dependency and must be installed first.  

## Usage

The main function of this library is `tag`.  
`tag` creates an HTML element with parameters you provide. Some of those parameters could be `box`es; `tag` will automatically subscribe to them and update related values when they are updated.  
Simple example would be:  

```typescript
import {tag} from "@nartallax/cardboard-dom"
import {box} from "@nartallax/cardboard"

const theme = box<"light" | "dark">("dark")

const root = tag({class: [
	"root-container",
	theme.map(theme => theme === "light" ? "light-theme" : "dark-theme")
]}, [
	tag({tag: "h1"}, ["Hello world!"]),
	tag({
		tag: "button",
		attrs: {value: "Click me!"},
		onClick: () => console.log("clicked!")
	})
])

document.body.append(root)
```

Note that `tag` will internally handle all of the `box` subscriptions; that means that no memory leak will occur, but there's a catch - the component values will only be updated when the component is mounted.  
It will take far too long to describe what `tag` can accept; you better look at typings and see for yourself.  

## whileMounted

The `tag` function alone don't cover everything you may need. For example, `tag` don't treat `value` attribute as special; that means the updates to the value of some input won't be automatically delivered to a `box` if you choose to pass one.  
To do anything you may need with `box`es, you can use `whileMounted` function. This function does the same that `tag` does with `box`es, but with arbitrary `box` that you provide; that is, allows to subscribe to a box without memory leak. For example:  

```typescript
import {WBox} from "@nartallax/cardboard"
import {tag, whileMounted} from "src/tag"

// get a value box from somewhere external, that's not important
const value: WBox<number> = getMyValueBox()

const input: HTMLInputElement = tag({
	tag: "input",
	attrs: {type: "text"},
	// passing value from input to the value box
	onChange: () => value(parseFloat(input.value))
})

// passing value from value box to input
whileMounted(input, value, newValue => input.value = newValue.toFixed(2))
```

Note that by default `whileMounted` immediately invokes the handles (unless explicitly asked otherwise).  
