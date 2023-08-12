import {WBox, box} from "@nartallax/cardboard"

type LocalStorageBoxParams<T> = {
	parse: (x: string) => T
	serialize: (x: T) => string
}

// TODO: rewrite in favor of dom binder or something more generic
// use-cases: setting css variable, local storage, binding to url parts
export function localStorageBox<T>(name: string): WBox<T | undefined>
export function localStorageBox<T>(name: string, defaultValue: T): WBox<T>
export function localStorageBox<T>(name: string, defaultValue: T, params: LocalStorageBoxParams<T>): WBox<T>
export function localStorageBox<T>(...args: unknown[]): WBox<T | undefined> {
	const name = args[0] as string
	const defaultValue = args[1] as T
	const params = args[2] as LocalStorageBoxParams<T>

	const {parse, serialize} = params || {parse: x => JSON.parse(x), serialize: x => JSON.stringify(x)}

	const startingValue = localStorage.getItem(name)
	const result = box(startingValue !== null ? parse(startingValue) : args.length > 1 ? defaultValue : undefined)

	result.subscribe(newValue => {
		if(newValue === undefined){
			localStorage.removeItem(name)
		} else {
			localStorage.setItem(name, serialize(newValue))
		}
	})

	return result
}