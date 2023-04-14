import {RBox, RBoxed, constBoxWrap} from "@nartallax/cardboard"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MRBoxed<T> = [T] extends [RBox<any>] ? T : RBox<T> | T

type GrabDefault<Props, K extends keyof Props, Defaults> =
	[undefined] extends [Props[K]]
		? [K] extends [keyof Defaults]
			? Exclude<Props[K], undefined>
			: Props[K]
		: Props[K]
export type BoxedProps<Props, Defaults = never> = {readonly [k in keyof Props]-?: RBoxed<GrabDefault<Props, k, Defaults>>}
type MRBoxedProps<Props> = {readonly [k in keyof Props]: MRBoxed<Props[k]>}

type Renderer<Props, Defaults = never> = (props: BoxedProps<Props, Defaults>) => HTMLElement
type ControlDef<Props> = (props: MRBoxedProps<Props>) => HTMLElement

export function defineControl<P, D extends Partial<P> = Partial<P>>(defaults: D, render: Renderer<P, D>): ControlDef<P>
export function defineControl<P>(render: Renderer<P>): ControlDef<P>
export function defineControl<P, D extends Partial<P>>(a: D | Renderer<P>, b?: Renderer<P, D>): ControlDef<P> {
	const renderer = typeof(a) === "function" ? a as Renderer<P, D> : b as Renderer<P, D>
	const defaults = typeof(a) === "function" ? {} as D : a as D
	return function controlWrap(props) {
		const boxedProps: Record<string, RBox<unknown>> = {}
		for(const key in props){
			let v = props[key]
			if(v === undefined && key in defaults){
				v = defaults[key as keyof D] as unknown as P[typeof key]
			}
			boxedProps[key] = constBoxWrap(v)
		}

		return renderer(boxedProps as BoxedProps<P, D>)
	}
}