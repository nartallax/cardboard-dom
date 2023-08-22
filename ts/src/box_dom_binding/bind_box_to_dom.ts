import {MRBox, RBox, constBoxWrap} from "@nartallax/cardboard"
import {CssVariableBoxLink, CssVariableBoxOptions} from "src/box_dom_binding/css_variable_box"
import {DomValueLink} from "src/box_dom_binding/dom_value_link"
import {LocalStorageBoxOptions, LocalStorageDomLink} from "src/box_dom_binding/local_storage_box"
import {UrlBoxDomLink, UrlOptions} from "src/box_dom_binding/url_box"
import {getBinder} from "src/node_binding"

export type DomBoxOptionsBase = {
	/** If true and the box is wbox, don't override original value right after invocation
	 * Value may be overwritten later, if DOM API supports watching the value
	 *
	 * Setting this flag also means that instead of overwriting value of the box, DOM value will be overwritten
	 * (because box must be in sync with DOM value) */
	readonly preferOriginalValue?: boolean
}

export type DomBoxBindingOptions<T> = (LocalStorageBoxOptions<T> | CssVariableBoxOptions | (string extends T ? UrlOptions : never))

export function bindBoxToDomValue<T>(node: Node, box: MRBox<T>, options: DomBoxBindingOptions<T>): void {
	const wrappedBox = constBoxWrap(box)
	const binder = getBinder(node)
	let link: DomValueLink<T>
	switch(options.type){
		case "localStorage": link = new LocalStorageDomLink(wrappedBox, options); break
		case "cssVariable": link = new CssVariableBoxLink(wrappedBox, options); break
		case "url": link = new UrlBoxDomLink(wrappedBox as RBox<string>, options) as unknown as DomValueLink<T>; break
	}
	binder.addDomValueLink(link)
}

export function unbindBoxToDom<T>(node: Node, options: DomBoxBindingOptions<T>): void {
	getBinder(node).removeDomValueLink(options)
}