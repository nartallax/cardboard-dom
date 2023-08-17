import {HTMLChildArray} from "src/functions/html_tag"
import {SVGChildArray} from "src/functions/svg_tag"

type Renderer<Props> = (props: Props, children: HTMLChildArray) => HTMLElement
type PropsOf<F> = F extends Renderer<infer P> ? P : never
type PropsAllOptional<F, IfTrue, IfFalse> = Record<string, never> extends PropsOf<F> ? IfTrue : IfFalse
type HasTwoArguments<F, IfTrue, IfFalse> = ((a: any, b: any) => any) extends F ? IfTrue : IfFalse
type HasOneArgument<F, IfTrue, IfFalse> = ((a: any) => any) extends F ? IfTrue : IfFalse

type ControlDef<ChildArray, Result, Func> = (...args: ArgsOfControl<ChildArray, Func>) => Result

type ArgsOfControl<ChildArray, Func> = HasTwoArguments<Func,
PropsAllOptional<Func,
// props all optional, has children
[PropsOf<Func>, ChildArray] | [PropsOf<Func>] | [ChildArray] | [],
// props not optional, has children
[PropsOf<Func>, ChildArray] | [PropsOf<Func>]
>,
PropsAllOptional<Func,
HasOneArgument<Func,
// props all optional, no children
[PropsOf<Func>] | [],
// no children, no props
[]
>,
// props not optional, no children
[PropsOf<Func>]
>>

// types are a bit weird here, but that way it kinda works
// that is, if you have any better idea how to write those types - you're welcome to try
// cases to keep in mind: generic controls, controls with all props optional, controls with no props
// also see tests
/** Wrap a function that renders some markup
 * This wrap allows to pass arguments easier (i.e. you can omit props if they are all optional etc)
 * First argument of render function, if present, must be props (which may be `unknown` if you don't need anything) */
const defineControlBase = <C, R, F extends (props: any, children: C) => R>(renderer: F): ControlDef<C, R, F> => {
	const expectsProps = renderer.length > 0
	const expectsChildren = renderer.length > 1

	const controlWrap = (propsOrChildren?: any, mbChildren?: any): R => {
		const firstArgIsChildren = Array.isArray(propsOrChildren)
		const props = (firstArgIsChildren ? expectsProps ? {} : null : propsOrChildren)
		const children = firstArgIsChildren ? propsOrChildren as HTMLChildArray : mbChildren

		return renderer(props, expectsChildren ? (children ?? []) : children)
	}

	return controlWrap as ControlDef<C, R, F>
}

type HTMLControlDef<F> = ControlDef<HTMLChildArray, HTMLElement, F>
export const defineControl = <F extends (props: any, children: HTMLChildArray) => HTMLElement>(renderer: F): HTMLControlDef<F> =>
	defineControlBase<HTMLChildArray, HTMLElement, F>(renderer)

type SVGControlDef<F> = ControlDef<SVGChildArray, SVGElement, F>
export const defineSvgControl = <F extends (props: any, children: SVGChildArray) => SVGElement>(renderer: F): SVGControlDef<F> =>
	defineControlBase<SVGChildArray, SVGElement, F>(renderer)