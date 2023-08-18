export function sleep(ms: number): Promise<void> {
	return new Promise(ok => setTimeout(ok, ms))
}

export function assertEquals(a: unknown, b: unknown): void {
	if(a !== b){
		throw new Error(`Expected ${a} === ${b}`)
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