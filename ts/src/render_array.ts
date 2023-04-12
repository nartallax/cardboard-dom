import {RBox, WBox} from "@nartallax/cardboard"
import {MaybeRBoxed} from "src/tag"

/** Cached renderer for list of elements
 * Won't re-render an element if already has one for the value */
export function renderArray<T, K, E extends Element>(src: WBox<readonly T[]>, getKey: (value: T) => K, render: (value: WBox<T>) => E): RBox<E[]>
export function renderArray<T, K, E extends Element>(src: RBox<readonly T[]>, getKey: (value: T) => K, render: (value: RBox<T>) => E): RBox<E[]>
export function renderArray<T, K, E extends Element>(src: MaybeRBoxed<readonly T[]>, getKey: (value: T) => K, render: (value: MaybeRBoxed<T>) => E): MaybeRBoxed<E[]>
export function renderArray<T, K, E extends Element>(src: readonly T[], getKey: (value: T) => K, render: (value: T) => E): E[]
export function renderArray<T, K, E extends Element>(src: MaybeRBoxed<readonly T[]> | WBox<T[]>, getKey: (value: T) => K, render: (value: WBox<T> | T) => E): E[] | RBox<E[]> {
	if(Array.isArray(src)){
		return src.map(el => render(el))
	}

	const map = new Map<WBox<T>, E>()

	return (src as WBox<T[]>).wrapElements(getKey).map(itemBoxes => {
		const leftoverBoxes = new Set(map.keys())

		const result = itemBoxes.map(itemBox => {
			leftoverBoxes.delete(itemBox)
			let el = map.get(itemBox)
			if(!el){
				el = render(itemBox)
				map.set(itemBox, el)
			}
			return el
		})

		for(const oldBox of leftoverBoxes){
			map.delete(oldBox)
		}

		return result
	})
}