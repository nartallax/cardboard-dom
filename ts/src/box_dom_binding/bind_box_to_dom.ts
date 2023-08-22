import {MRBox, RBox, constBoxWrap} from "@nartallax/cardboard"
import {CssVariableBoxLink, CssVariableBoxOptions} from "src/box_dom_binding/css_variable_box"
import {DomValueLink} from "src/box_dom_binding/dom_value_link"
import {LocalStorageBoxOptions, LocalStorageDomLink} from "src/box_dom_binding/local_storage_box"
import {UrlBoxDomLink, UrlOptions} from "src/box_dom_binding/url_box"
import {getBinder} from "src/node_binding"

export type DomBoxOptionsBase = {
	/** This flag is used when resolving conflicts between DOM value and box value
	 * like, "we have new box value and new DOM value, what should happen?"
	 * If the flag is false (default) - that means box value will be overwritten by DOM value
	 * If the flag is true - DOM value will be overwritten
	 * ...or you can just pass an RBox, which cannot be overwritten and will always have preference */
	readonly preferBoxValue?: boolean
}

export type DomBoxBindingOptions<T> = (LocalStorageBoxOptions<T> | CssVariableBoxOptions | (string extends T ? UrlOptions : never))

export function bindBoxToDomValue<T>(node: Node, box: MRBox<T>, options: DomBoxBindingOptions<T>): void {
	const wrappedBox = constBoxWrap(box)
	const binder = getBinder(node)
	let link: DomValueLink<T>
	switch(options.type){
		case "localStorage": link = new LocalStorageDomLink(wrappedBox, options); break
		case "cssVariable": link = new CssVariableBoxLink(node, wrappedBox, options); break
		case "url": link = new UrlBoxDomLink(wrappedBox as RBox<string>, options) as unknown as DomValueLink<T>; break
	}
	binder.addDomValueLink(link)
}

export function unbindBoxToDom<T>(node: Node, options: DomBoxBindingOptions<T>): void {
	getBinder(node).removeDomValueLink(options)
}