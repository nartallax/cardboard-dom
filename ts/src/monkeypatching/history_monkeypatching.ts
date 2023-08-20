import {CheckRepeater} from "src/parts/check_repeater"

class HistoryUpdateWatcher {

	private readonly handlers = new Set<() => void>()
	private lastKnownLocation = ""
	private isPatched = false
	private repeater = new CheckRepeater(1000, this.tryCallHandlers.bind(this))

	subscribe(handler: () => void) {
		this.handlers.add(handler)
		if(!this.isPatched){
			this.isPatched = true
			this.patch()
		}
	}

	unsubscribe(handler: () => void): void {
		this.handlers.delete(handler)
	}

	private patch(): void {
		this.lastKnownLocation = window.location + ""

		const proto = History.prototype as any

		for(const key in proto){
			let original: any
			try {
				original = proto[key]
			} catch(e){
				// could happen in case of props
				// thing is, methods could also be defined as props
				// so I don't want to miss anything
				continue
			}
			if(typeof(original) !== "function"){
				continue
			}
			// eslint-disable-next-line @typescript-eslint/no-this-alias
			const self = this
			const patched = function(this: any, ...args: any[]): any {
				const result = original.apply(this, args)
				/* this is kinda bad
				* but some of the history methods don't change location synchronously,
				* and there's no way to get it anywhere else.
				*
				* I was thinking about maintaining history stack by myself,
				* but that won't cover all of the cases (like some of the history added before patch) */
				self.repeater.run()
				return result
			}
			proto[key] = patched
		}
	}

	private tryCallHandlers(): boolean {
		const currentLocation = window.location + ""
		if(currentLocation === this.lastKnownLocation){
			return false
		}
		this.lastKnownLocation = currentLocation
		for(const handler of this.handlers){
			handler()
		}
		return true
	}

}

export const historyUpdateWatcher = new HistoryUpdateWatcher()