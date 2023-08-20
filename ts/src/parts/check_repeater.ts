export class CheckRepeater {

	private startTime = 0
	private isRunning = false

	constructor(private readonly timeoutMs: number, private readonly check: () => boolean) {}

	private runCheckAndRequest(): void {
		const fn = () => {
			try {
				if(this.check() || Date.now() - this.startTime > this.timeoutMs){
					this.isRunning = false
					return
				}
			} catch(e){
				this.isRunning = false
				throw e
			}
			requestFrame(fn)
		}

		this.isRunning = true
		fn()
	}

	run(): void {
		this.startTime = Date.now()
		if(!this.isRunning){
			this.runCheckAndRequest()
		}
	}

}

const requestFrame: (callback: () => void) => unknown = requestAnimationFrame as any ?? ((callback: () => void) => setTimeout(callback, 1000 / 60) as unknown)