import {RBox, RBoxed, constBoxWrap} from "@nartallax/cardboard"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MRBoxed<T> = T extends RBox<any> ? T : RBox<T> | T

type BoxedProps<Props> = {readonly [k in keyof Props]: RBoxed<Props[k]>}
type MRBoxedProps<Props> = {readonly [k in keyof Props]: MRBoxed<Props[k]>}

export function defineControl<Props>(render: (props: BoxedProps<Props>) => HTMLElement): (props: MRBoxedProps<Props>) => HTMLElement {
	return function controlWrap(props) {
		const boxedProps: Record<string, RBox<unknown>> = {}
		for(const key in props){
			boxedProps[key] = constBoxWrap(props[key])
		}

		return render(boxedProps as BoxedProps<Props>)
	}
}