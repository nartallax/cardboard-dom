import {unbox} from "@nartallax/cardboard"
import {HTMLChildArray} from "src/functions/html_tag"

type Renderer<Props> = (props: Props, children: HTMLChildArray) => HTMLElement
type ControlDef<Props> = (Record<string, never> extends Props ? (children?: HTMLChildArray) => HTMLElement : void) & ((props: Props, children?: HTMLChildArray) => HTMLElement)

// TODO: think about generic controls,
// and controls with all props optional, that can take either props and children or just children or nothing
export function defineControl<P>(renderer: Renderer<P>): ControlDef<P> {
	const expectsChildren = renderer.length > 1

	const controlWrap = (propsOrChildren?: P | HTMLChildArray, mbChildren?: HTMLChildArray): HTMLElement => {
		const firstArgIsChildren = Array.isArray(unbox(propsOrChildren))
		const props = (firstArgIsChildren ? {} : propsOrChildren) as P
		const children = firstArgIsChildren ? propsOrChildren as HTMLChildArray : mbChildren

		return renderer(props, expectsChildren ? (children ?? []) : children!)
	}

	return controlWrap as ControlDef<P>
}
