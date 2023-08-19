import {RBox, isWBox} from "@nartallax/cardboard"

type OptionsBase = {
	/** If true and the box is wbox, don't override original value right after invocation
	 * Value may be overwritten later, if DOM API supports watching the value
	 *
	 * Setting this flag also means that instead of overwriting value of the box, DOM value will be overwritten
	 * (because box must be in sync with DOM value) */
	readonly preferOriginalValue?: boolean
}

type LocalStorageBaseOptions = OptionsBase & {
	readonly type: "localStorage"
	readonly key: string
}
type LocalStorageParserOptions<T> = LocalStorageBaseOptions & {
	readonly parse: (x: string) => T
	readonly serialize: (x: T) => string
}
type LocalStorageOptions<T> = LocalStorageBaseOptions | LocalStorageParserOptions<T>

type UrlOptions = OptionsBase & {
	readonly type: "url"
	readonly part: "path" | "hash" | "pathAndHash"
}

function hasParserOptions<T>(opts: LocalStorageOptions<T>): opts is LocalStorageParserOptions<T> {
	return !!(opts as LocalStorageParserOptions<T>).parse
}

type Options<T> = (LocalStorageOptions<T> | (string extends T ? UrlOptions : never))

export function bindBoxToDom<T>(box: RBox<T>, options: Options<T>): void {
	switch(options.type){
		case "localStorage": bindBoxToLocalStorage(box, options); return
		// case "url": bindBoxToUrl(box as RBox<string>, options); return
	}
}

const jsonParser = (x: string) => JSON.parse(x)
const jsonSerializer = (x: any) => JSON.stringify(x)

function bindBoxToLocalStorage<T>(box: RBox<T>, options: LocalStorageOptions<T>): void {
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

// function bindBoxToUrl(box: RBox<string>, options: UrlOptions): void {

// }