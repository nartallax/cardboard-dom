/** Make a promise that is resolved when the document is in "interactive" state or further */
export function waitDocumentLoaded(): Promise<void> {
	return new Promise(ok => {
		const check = () => {
			if(document.readyState === "interactive" || document.readyState === "complete"){
				document.removeEventListener("readystatechange", check, false)
				ok()
				return true
			}
			return false
		}

		if(check()){
			return
		}

		document.addEventListener("readystatechange", check, false)
	})
}