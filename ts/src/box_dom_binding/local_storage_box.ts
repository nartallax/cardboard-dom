import {RBox, WBox, box, isWBox} from "@nartallax/cardboard"
import {DomBoxOptionsBase} from "src/box_dom_binding/bind_box_to_dom"

const jsonParser = (x: string) => JSON.parse(x)
const jsonSerializer = (x: any) => JSON.stringify(x)

type LocalStorageBaseOptions = DomBoxOptionsBase & {
	readonly type: "localStorage"
	readonly key: string
}
type LocalStorageParserOptions<T> = LocalStorageBaseOptions & {
	readonly parse: (x: string) => T
	readonly serialize: (x: T) => string
}
export type LocalStorageBoxOptions<T> = LocalStorageBaseOptions | LocalStorageParserOptions<T>

function hasParserOptions<T>(opts: LocalStorageBoxOptions<T>): opts is LocalStorageParserOptions<T> {
	return !!(opts as LocalStorageParserOptions<T>).parse
}

export function bindBoxToLocalStorage<T>(box: RBox<T>, options: LocalStorageBoxOptions<T>): void {
	let parse = jsonParser, serialize = jsonSerializer
	if(hasParserOptions(options)){
		parse = options.parse
		serialize = options.serialize
	}
	const key = options.key

	const setLocalStorageValue = (newValue: T) => {
		const serialized = serialize(newValue)
		if(serialized === null){
			localStorage.removeItem(key)
		} else {
			localStorage.setItem(key, serialized)
		}
	}

	{
		const existingValue = localStorage.getItem(key)
		if(!options.preferOriginalValue && existingValue !== null && isWBox(box)){
			box.set(parse(existingValue))
		} else {
			setLocalStorageValue(box.get())
		}
	}

	box.subscribe(setLocalStorageValue)
}

export function localStorageBox<T>(initialValue: T, key: string, options?: Omit<LocalStorageBoxOptions<T>, "type" | "key">): WBox<T> {
	const result = box(initialValue)
	bindBoxToLocalStorage(result, {...(options || {}), key, type: "localStorage"})
	return result
}