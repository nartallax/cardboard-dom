export type Maybe<E> = E | null | undefined
export type MaybeArray<E> = E | readonly E[]

// why is this not in default typings...?
export function isArray<T>(a: MaybeArray<T>): a is readonly T[] {
	return Array.isArray(a)
}