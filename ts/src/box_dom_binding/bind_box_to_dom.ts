import {RBox} from "@nartallax/cardboard"
import {CssVariableBoxOptions, bindBoxToCssVariable} from "src/box_dom_binding/css_variable_box"
import {LocalStorageBoxOptions, bindBoxToLocalStorage} from "src/box_dom_binding/local_storage_box"
import {UrlOptions, bindBoxToUrl} from "src/box_dom_binding/url_box"

export type DomBoxOptionsBase = {
	/** If true and the box is wbox, don't override original value right after invocation
	 * Value may be overwritten later, if DOM API supports watching the value
	 *
	 * Setting this flag also means that instead of overwriting value of the box, DOM value will be overwritten
	 * (because box must be in sync with DOM value) */
	readonly preferOriginalValue?: boolean
}

type Options<T> = (LocalStorageBoxOptions<T> | CssVariableBoxOptions | (string extends T ? UrlOptions : never))

// TODO: this box won't unsubscribe ever, which is bad.
// we need special kind of box, that subscribes/unsubscribes to externals only when have subscription
/** This function is a way to link arbitrary box to some of well-known DOM values,
 * like URL parts or local storage values
 *
 * In case there's API for receiving updates for the value and the box is wbox,
 * the box will receive updates from DOM.
 * Otherwise only the DOM value will be updated by box's value. */
export function bindBoxToDomValue<T>(box: RBox<T>, options: Options<T>): void {
	switch(options.type){
		case "localStorage": bindBoxToLocalStorage(box, options); return
		case "cssVariable": bindBoxToCssVariable(box, options); return
		case "url": bindBoxToUrl(box as RBox<string>, options); return
	}
}