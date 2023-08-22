import {WBox, box} from "@nartallax/cardboard"
import {DomBoxOptionsBase, bindBoxToDomValue} from "src/box_dom_binding/bind_box_to_dom"
import {DomValueLink} from "src/box_dom_binding/dom_value_link"
import {historyUpdateWatcher} from "src/monkeypatching/history_monkeypatching"

export type UrlOptions = DomBoxOptionsBase & {
	readonly type: "url"
	readonly path?: boolean
	readonly search?: boolean
	readonly hash?: boolean
	readonly history?: "replace" | "push"
}

export class UrlBoxDomLink extends DomValueLink<string, string, UrlOptions> {

	protected getRawDomValue(): string {
		return window.location + ""
	}

	protected parseDomValue(raw: string): string {
		const url = new URL(raw)

		let result = ""
		if(this.options.path){
			result += url.pathname
		}
		if(this.options.search){
			result += url.search
		}
		if(this.options.hash){
			result += url.hash
		}

		return result
	}

	protected updateDomValue(value: string): void {
		const url = new URL(value, window.location + "")

		// we won't overwrite existing search/path if this is not explicitly enabled
		// even if user puts something that resembles search/path
		if(!this.options.search){
			url.search = window.location.search
		}
		if(!this.options.path){
			url.pathname = window.location.pathname
		}
		if(!this.options.hash){
			url.hash = window.location.hash
		}

		if(url + "" === window.location + ""){
			return
		}

		if((this.options.history ?? "replace") === "replace"){
			window.history.replaceState(null, "", url)
		} else {
			window.history.pushState(null, "", url)
		}
	}

	protected subscribeToDomValue(): void {
		const handler = this.updateBoxValueBound

		historyUpdateWatcher.subscribe(handler)

		if(this.options.hash){
			// setting url through window.location.hash = "#123" won't trigger history api
			window.addEventListener("hashchange", handler)
		}
	}

	protected unsubscribeFromDomValue(): void {
		const handler = this.updateBoxValueBound

		historyUpdateWatcher.unsubscribe(handler)

		if(this.options.hash){
			window.removeEventListener("hashchange", handler)
		}
	}

}

export function urlBox(node: Node, options: Omit<UrlOptions, "type" | "preferOriginalValue">): WBox<string> {
	const result = box("")
	bindBoxToDomValue(node, result, {...options, type: "url"})
	return result
}