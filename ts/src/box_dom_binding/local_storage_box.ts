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

/** Create a writable box that is linked to a value in localStorage.
 * initialValue is only used when a key is not present in the localStorage.
 *
 * Value is JSON-serialized for storage. */
export function localStorageBox<T>(node: Node, key: string, initialValue: T): WBox<T>
/** Create a writable box that is linked to a value in localStorage.
 * initialValue is only used when a key is not present in the localStorage.
 *
 * If you chose to pass options - you must pass custom serializer.
 * It is done for the case when preferBoxValue is false, and the value in the local storage is absent;
 * so you must do something about `null` as parser input.
 *
 * This also gives you an opportunity to delete value from local storage by returning `null` from serializer. */
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