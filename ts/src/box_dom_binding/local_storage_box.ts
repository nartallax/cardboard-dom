import {WBox, box} from "@nartallax/cardboard"
import {DomBoxOptionsBase, bindBoxToDomValue} from "src/box_dom_binding/bind_box_to_dom"
import {DomValueLink} from "src/box_dom_binding/dom_value_link"

export interface LocalStorageBoxOptions<T> extends DomBoxOptionsBase {
	readonly type: "localStorage"
	readonly key: string
	readonly parse: (x: string | null) => T
	readonly serialize: (x: T) => string | null
}

export class LocalStorageDomLink<T> extends DomValueLink<T, string | null, LocalStorageBoxOptions<T>> {

	protected getRawDomValue(): string | null {
		return localStorage.getItem(this.options.key)
	}

	protected updateDomValue(value: T): void {
		const key = this.options.key
		const serialized = this.options.serialize(value)
		if(serialized === null){
			localStorage.removeItem(key)
		} else {
			localStorage.setItem(key, serialized)
		}
	}

	protected parseDomValue(raw: string | null): T {
		return this.options.parse(raw)
	}

}

export function localStorageBox<T>(node: Node, key: string, initialValue: T): WBox<T>
export function localStorageBox<T>(node: Node, key: string, initialValue: T, options: Omit<LocalStorageBoxOptions<T>, "type" | "key">): WBox<T>
export function localStorageBox<T>(node: Node, key: string, initialValue: T, options?: Omit<LocalStorageBoxOptions<T>, "type" | "key">): WBox<T> {
	const result = box(initialValue)
	bindBoxToDomValue(node, result, {
		parse: value => JSON.parse(value + ""),
		serialize: value => JSON.stringify(value),
		preferBoxValue: localStorage.getItem(key) === null,
		...(options || {}),
		key,
		type: "localStorage"
	})
	return result
}