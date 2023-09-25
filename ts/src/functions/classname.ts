import {Binder} from "src/parts/binder"
import {MRBox, isRBox, unbox} from "@nartallax/cardboard"
import {getBinder} from "src/node_binding"

type MbArrayRecursive<T> = T | readonly MbArrayRecursive<T>[]
type ClassNamePart = MRBox<string | null | undefined> | Record<string, MRBox<boolean | undefined>>
export type ClassName = MbArrayRecursive<ClassNamePart>

function flattenRecursive<T>(value: MbArrayRecursive<T>, result: T[] = []): T[] {
	if(Array.isArray(value)){
		for(const item of value){
			flattenRecursive(item, result)
		}
	} else {
		result.push(value as T)
	}
	return result
}

/** Assemble classname from parts, subscribing to all the boxes, and call the callback */
export function bindClassname(binder: Binder | null, node: Node, className: ClassName, callback: (className: string) => void): Binder | null {

	const arr = flattenRecursive(className)
	for(const part of arr){
		if(isRBox(part)){
			(binder ||= getBinder(node)).watch(part, makeClassnameAndCallTheCallback, true)
		} else if(part && typeof(part) === "object"){
			for(const key in part){
				const bool = part[key]
				if(isRBox(bool)){
					(binder ||= getBinder(node)).watch(bool, makeClassnameAndCallTheCallback, true)
				}
			}
		}
	}

	makeClassnameAndCallTheCallback()

	function makeClassnameAndCallTheCallback() {
		const result = []
		for(const part of arr){
			if(part && typeof(part) === "object" && !isRBox(part)){
				for(const classname in part){
					if(unbox(part[classname])){
						result.push(classname)
					}
				}
			} else {
				const classname = unbox(part)
				if(classname){
					result.push(classname)
				}
			}
		}
		callback(result.join(" "))
	}

	return binder
}