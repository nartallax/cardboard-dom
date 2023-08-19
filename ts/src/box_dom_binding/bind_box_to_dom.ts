import {RBox} from "@nartallax/cardboard"
import {LocalStorageBoxOptions, bindBoxToLocalStorage} from "src/box_dom_binding/local_storage_box"

export type DomBoxOptionsBase = {
	/** If true and the box is wbox, don't override original value right after invocation
	 * Value may be overwritten later, if DOM API supports watching the value
	 *
	 * Setting this flag also means that instead of overwriting value of the box, DOM value will be overwritten
	 * (because box must be in sync with DOM value) */
	readonly preferOriginalValue?: boolean
}

type UrlOptions = DomBoxOptionsBase & {
	readonly type: "url"
	readonly part: "path" | "hash" | "pathAndHash"
}

type Options<T> = (LocalStorageBoxOptions<T> | (string extends T ? UrlOptions : never))

/** This function is a way to link arbitrary box to some of well-known DOM values,
 * like URL parts or local storage values
 *
 * In case there's API for receiving updates for the value and the box is wbox,
 * the box will receive updates from DOM.
 * Otherwise only the DOM value will be updated by box's value. */
export function bindBoxToDomValue<T>(box: RBox<T>, options: Options<T>): void {
	switch(options.type){
		case "localStorage": bindBoxToLocalStorage(box, options); return
		// case "url": bindBoxToUrl(box as RBox<string>, options); return
	}
}

// function bindBoxToUrl(box: RBox<string>, options: UrlOptions): void {

// }