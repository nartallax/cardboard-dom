import {RBox, WBox, box} from "@nartallax/cardboard"
import {DomBoxOptionsBase, bindBoxToDomValue} from "src/box_dom_binding/bind_box_to_dom"
import {DomValueLink} from "src/box_dom_binding/dom_value_link"

export type CssVariableBoxOptions = DomBoxOptionsBase & {
	readonly type: "cssVariable"
	readonly name: string
	readonly element?: HTMLElement // TODO: use target element as default?
}

export class CssVariableBoxLink<T> extends DomValueLink<T, string, CssVariableBoxOptions> {

	constructor(box: RBox<T>, options: CssVariableBoxOptions) {
		const opts: CssVariableBoxOptions = {...options, preferBoxValue: options.preferBoxValue ?? true}
		super(box, opts)
	}

	protected getRawDomValue(): string {
		return (this.options.element ?? document.body).style.getPropertyValue(this.options.name)
	}

	protected updateDomValue(value: T): void {
		const el = this.options.element ?? document.body
		const name = this.options.name

		if(value === null || value === undefined || value === "" || (typeof(value) !== "string" && typeof(value) !== "number")){
			el.style.removeProperty(name)
		} else {
			el.style.setProperty(name, value + "")
		}
	}

	protected parseDomValue(): T {
		throw new Error("There's no way to move value of CSS variable into box, because it could break types: CSS variable is always string, but box may be of different type. If you need to do that - do that explicitly by using element.style.getPropertyValue(name)")
	}

}

export function cssVariableBox<T>(node: Node, name: string, value: T, options?: Omit<CssVariableBoxOptions, "type" | "name">): WBox<T> {
	const result = box(value)
	bindBoxToDomValue(node, result, {...(options || {}), name, type: "cssVariable"})
	return result
}