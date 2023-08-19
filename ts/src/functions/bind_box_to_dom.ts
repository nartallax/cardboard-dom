import {RBox, isWBox} from "@nartallax/cardboard"

type LocalStorageBaseOptions = {
	readonly type: "localStorage"
	readonly key: string
}
type LocalStorageParserOptions<T> = LocalStorageBaseOptions & {
	readonly parse: (x: string) => T
	readonly serialize: (x: T) => string
}
type LocalStorageOptions<T> = LocalStorageBaseOptions | LocalStorageParserOptions<T>

function hasParserOptions<T>(opts: LocalStorageOptions<T>): opts is LocalStorageParserOptions<T> {
	return !!(opts as LocalStorageParserOptions<T>).parse
}

type Options<T> = LocalStorageOptions<T>

export function bindBoxToDom<T>(box: RBox<T>, options: Options<T>): void {
	switch(options.type){
		case "localStorage": bindBoxToLocalStorage(box, options); return
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
	const name = options.key

	{
		const existingValue = localStorage.getItem(name)
		if(existingValue !== null && isWBox(box)){
			box.set(parse(existingValue))
		}
	}


	box.subscribe(newValue => {
		const serialized = serialize(newValue)
		if(serialized === null){
			localStorage.removeItem(name)
		} else {
			localStorage.setItem(name, serialized)
		}
	})
}