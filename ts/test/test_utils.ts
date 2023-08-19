export function sleep(ms: number): Promise<void> {
	return new Promise(ok => setTimeout(ok, ms))
}

export function assertEquals(a: unknown, b: unknown): void {
	if(a !== b){
		throw new Error(`Expected ${a} === ${b}`)
	}
}

export function assertErrorTextMatches(e: unknown, regexp: RegExp): void {
	if(!(e instanceof Error)){
		throw new Error("Expected error text to match " + regexp + ", but that's not an error: " + e)
	}
	const text = e + ""
	if(!regexp.test(text)){
		throw new Error("Expected error text to match " + regexp + ", but it's not: " + text)
	}
}

export function assertTruthy(a: unknown, msg?: string): void {
	if(!a){
		throw new Error(msg ?? `Expected truthy value, got ${a}`)
	}
}

export function assertFalsy(a: unknown, msg?: string): void {
	if(a){
		throw new Error(msg ?? `Expected falsy value, got ${a}`)
	}
}