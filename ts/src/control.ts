import {RBox, Boxed, WBox, constBoxWrap} from "@nartallax/cardboard"
import {HTMLChildArray} from "src/tag"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MRBoxed<T> = [T] extends [RBox<any> | WBox<any>] ? T : RBox<T> | T

export type BoxedProps<Props, Defaults = Record<never, unknown>> = {
	readonly [k in Exclude<keyof Props, keyof Defaults>]: Extract<Props[k], undefined> | Boxed<Exclude<Props[k], undefined>>
} & {
	readonly [k in keyof Defaults]: Boxed<Defaults[k]>
}
type MRBoxedProps<Props> = {readonly [k in keyof Props]: MRBoxed<Props[k]>}

type Renderer<Props, Defaults = Record<never, unknown>> = (props: BoxedProps<Props, Defaults>, children: HTMLChildArray) => HTMLElement
type ControlDef<Props> = (props: MRBoxedProps<Props>, children?: HTMLChildArray) => HTMLElement

export function defineControl<P, D extends Partial<P> = Partial<P>>(defaults: D, render: Renderer<P, D>): ControlDef<P>
export function defineControl<P>(render: Renderer<P>): ControlDef<P>
export function defineControl<P, D extends Partial<P>>(a: D | Renderer<P, D>, b?: Renderer<P, D>): ControlDef<P> {
	const renderer = typeof(a) === "function" ? a as Renderer<P, D> : b as Renderer<P, D>
	const defaults = typeof(a) === "function" ? {} as D : a as D
	const expectsChildren = renderer.length > 1
	return function controlWrap(props, children) {
		const boxedProps: Record<string, RBox<unknown>> = {}
		for(const key in props){
			let v = props[key]
			if(v === undefined && key in defaults){
				v = defaults[key as keyof D] as unknown as P[typeof key]
			}
			boxedProps[key] = constBoxWrap(v)
		}
		for(const key in defaults){
			if(!(key in boxedProps)){
				boxedProps[key] = constBoxWrap(defaults[key])
			}
		}

		return renderer(boxedProps as BoxedProps<P, D>, expectsChildren ? (children ?? []) : children!)
	}
}
