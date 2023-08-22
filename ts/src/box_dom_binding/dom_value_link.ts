import {RBox, isWBox} from "@nartallax/cardboard"
import {DomBoxOptionsBase} from "src/box_dom_binding/bind_box_to_dom"
import {Binder} from "src/parts/binder"

const NoValueKnown = Symbol("dom-value-link-no-value-known")

/** Some wrapper around DOM value that can bind box to the value */
export abstract class DomValueLink<T, R = unknown, O extends DomBoxOptionsBase = DomBoxOptionsBase> {
	protected abstract updateDomValue(value: T): void
	protected abstract parseDomValue(domValue: R): T
	protected abstract getRawDomValue(): R
	protected subscribeToDomValue(): void {
		// nothing by default; there's no way to subscribe to some of the DOM values
		// subclasses are supposed to set up event listeners that call this.updateBoxValueBound
		// (bound = can be used without call context; was .bind(this)-ed)
	}
	protected unsubscribeFromDomValue(): void {
		// nothing by default
	}

	private readonly subscribeDomBound: () => void
	private readonly unsubscribeDomBound: () => void
	private readonly tryUpdateDomValueBound: (value: T) => void
	protected readonly updateBoxValueBound: () => void
	private lastKnownRawDomValue: R | typeof NoValueKnown = NoValueKnown

	constructor(readonly box: RBox<T>, readonly options: O) {
		this.subscribeDomBound = this.subscribeToDomValue.bind(this)
		this.unsubscribeDomBound = this.unsubscribeFromDomValue.bind(this)
		this.tryUpdateDomValueBound = this.tryUpdateDomValue.bind(this)
		this.updateBoxValueBound = this.updateBoxValue.bind(this)
	}

	private canPushUpdates(): boolean {
		return this.subscribeToDomValue !== DomValueLink.prototype.subscribeToDomValue && isWBox(this.box)
	}

	protected updateBoxValue(): void {
		if(!isWBox(this.box)){
			return
		}

		const rawValue = this.getRawDomValue()
		if(this.lastKnownRawDomValue === rawValue){
			return
		}
		this.lastKnownRawDomValue = rawValue
		this.box.set(this.parseDomValue(rawValue))
	}

	private tryUpdateDomValue(value: T): void {
		const rawDomValue = this.getRawDomValue()
		const preferBoxValue = this.options.preferBoxValue || !isWBox(this.box)
		if(rawDomValue !== this.lastKnownRawDomValue && !preferBoxValue){
			return // we don't actually update anything here. we expect box value to be updated in other handler
		}

		this.updateDomValue(value)
		this.lastKnownRawDomValue = this.getRawDomValue()
	}

	bind(binder: Binder): void {
		if(this.canPushUpdates()){
			binder.onInserted(this.updateBoxValueBound)
			binder.onInserted(this.subscribeDomBound)
			binder.onRemoved(this.unsubscribeDomBound)
		}

		if(binder.isInDom){
			this.subscribeToDomValue()
		}

		if(this.options.preferBoxValue || !isWBox(this.box)){
			binder.watchAndRun(this.box, this.tryUpdateDomValueBound)
		} else {
			binder.watch(this.box, this.tryUpdateDomValueBound)
			this.updateBoxValue()
		}
	}

	unbind(binder: Binder): void {
		if(this.canPushUpdates()){
			binder.offInserted(this.updateBoxValueBound)
			binder.offInserted(this.subscribeDomBound)
			binder.offRemoved(this.unsubscribeDomBound)
			if(binder.isInDom){
				this.unsubscribeFromDomValue()
			}
		}
		binder.unwatch(this.tryUpdateDomValueBound)
	}

}