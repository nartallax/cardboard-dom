import {RBox, WBox, box, isWBox} from "@nartallax/cardboard"
import {DomBoxOptionsBase} from "src/box_dom_binding/bind_box_to_dom"
import {historyUpdateWatcher} from "src/monkeypatching/history_monkeypatching"

export type UrlOptions = DomBoxOptionsBase & {
	readonly type: "url"
	readonly path?: boolean
	readonly search?: boolean
	readonly hash?: boolean
	readonly history?: "replace" | "push"
}

export function bindBoxToUrl(box: RBox<string>, options: UrlOptions): void {
	const historyAction = options.history ?? "replace"

	const assembleValue = () => {
		const url = window.location

		let result = ""
		if(options.path){
			result += url.pathname
		}
		if(options.search){
			result += url.search
		}
		if(options.hash){
			result += url.hash
		}

		return result
	}

	const tryPutValueIntoUrl = (value: string) => {
		const url = new URL(value, window.location + "")

		// we won't overwrite existing search/path if this is not explicitly enabled
		// even if user puts something that resembles search/path
		if(!options.search){
			url.search = window.location.search
		}
		if(!options.path){
			url.pathname = window.location.pathname
		}
		if(!options.hash){
			url.hash = window.location.hash
		}

		if(url + "" === window.location + ""){
			return
		}

		if(historyAction === "replace"){
			window.history.pushState(null, "", url)
		} else {
			window.history.replaceState(null, "", url)
		}
	}

	if(isWBox(box)){
		if(!options.preferOriginalValue){
			box.set(assembleValue())
		}

		if(options.path || options.search){
			historyUpdateWatcher.subscribe(() => box.set(assembleValue()))
		}

		if(options.hash){
			window.addEventListener("hashchange", () => box.set(assembleValue()))
		}
	}

	box.subscribe(tryPutValueIntoUrl)
	if(options.preferOriginalValue){
		tryPutValueIntoUrl(box.get())
	}
}

export function urlBox(options: Omit<UrlOptions, "type" | "preferOriginalValue">): WBox<string> {
	const result = box("")
	bindBoxToUrl(result, {...options, type: "url"})
	return result
}