import {RBox, WBox, box} from "@nartallax/cardboard"
import {DomBoxOptionsBase} from "src/box_dom_binding/bind_box_to_dom"

export type CssVariableBoxOptions = DomBoxOptionsBase & {
	readonly type: "cssVariable"
	readonly name: string
	readonly element?: HTMLElement
}

export function bindBoxToCssVariable<T>(box: RBox<T>, opts: CssVariableBoxOptions): void {
	const el = opts.element ?? document.body
	const name = opts.name

	const setCssProperty = (value: T) => {
		if(value === null || value === undefined || value === "" || (typeof(value) !== "string" && typeof(value) !== "number")){
			el.style.removeProperty(name)
		} else {
			el.style.setProperty(name, value + "")
		}
	}

	setCssProperty(box.get())
	box.subscribe(setCssProperty)
}

export function cssVariableBox<T>(value: T, name: string, options?: Omit<CssVariableBoxOptions, "type" | "name">): WBox<T> {
	const result = box(value)
	bindBoxToCssVariable(result, {...(options || {}), name, type: "cssVariable"})
	return result
}