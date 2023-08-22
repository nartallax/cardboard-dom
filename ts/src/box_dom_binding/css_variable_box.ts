import {RBox, WBox, box, isWBox} from "@nartallax/cardboard"
import {DomBoxOptionsBase, bindBoxToDomValue} from "src/box_dom_binding/bind_box_to_dom"
import {DomValueLink} from "src/box_dom_binding/dom_value_link"

export type CssVariableBoxOptions = DomBoxOptionsBase & {
	readonly type: "cssVariable"
	readonly name: string
	readonly element?: HTMLElement
}

export class CssVariableBoxLink<T> extends DomValueLink<T, string, CssVariableBoxOptions> {

	constructor(private readonly node: Node, box: RBox<T>, options: CssVariableBoxOptions) {
		if(isWBox(box)){
			// never try to put anything in this box
			box = box.map(x => x)
		}
		super(box, options)
	}

	private get element(): HTMLElement {
		return this.options.element ?? (this.node instanceof HTMLElement ? this.node : null) ?? document.body
	}

	protected getRawDomValue(): string {
		return (this.options.element ?? document.body).style.getPropertyValue(this.options.name)
	}

	protected updateDomValue(value: T): void {
		const name = this.options.name

		if(value === null || value === undefined || value === "" || (typeof(value) !== "string" && typeof(value) !== "number")){
			this.element.style.removeProperty(name)
		} else {
			this.element.style.setProperty(name, value + "")
		}
	}

	protected parseDomValue(): T {
		throw new Error("There's no way to move value of CSS variable into box, because it could break types: CSS variable is always string, but box may be of different type. If you need to do that - do that explicitly by using element.style.getPropertyValue(name)")
	}

}

/** Creates a writable box that is linked to CSS variable on a particular element.
 * Keep in mind that name should start with --
 * If value of the variable is non-empty string, or number - the variable will take this value;
 * otherwise, variable will be deleted. */
export function cssVariableBox<T>(node: Node, name: string, value: T, options?: Omit<CssVariableBoxOptions, "type" | "name">): WBox<T> {
	const result = box(value)
	bindBoxToDomValue(node, result, {...(options || {}), name, type: "cssVariable"})
	return result
}