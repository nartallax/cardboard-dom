import {Binder} from "src/parts/binder"
import {MRBox, isRBox, unbox} from "@nartallax/cardboard"
import {getBinder} from "src/node_binding"

type ClassNamePart = MRBox<string | null | undefined> | Record<string, MRBox<boolean | undefined>>
export type ClassNameParts = ClassNamePart | ClassNamePart[]

/** Assemble classname from parts, subscribing to all the boxes, and call the callback */
export function bindClassname(binder: Binder | null, node: Node, parts: ClassNameParts, callback: (className: string) => void): Binder | null {
	const arr = Array.isArray(parts) ? parts : [parts]
	for(const item of arr){
		if(isRBox(item)){
			(binder ||= getBinder(node)).watch(item, makeClassnameAndCallTheCallback, true)
		} else if(item && typeof(item) === "object"){
			for(const key in item){
				const bool = item[key]
				if(isRBox(bool)){
					(binder ||= getBinder(node)).watch(bool, makeClassnameAndCallTheCallback, true)
				}
			}
		}
	}
	makeClassnameAndCallTheCallback()

	function makeClassnameAndCallTheCallback() {
		const result = []
		for(const item of arr){
			if(item && typeof(item) === "object" && !isRBox(item)){
				for(const classname in item){
					if(unbox(item[classname])){
						result.push(classname)
					}
				}
			} else {
				const classname = unbox(item)
				if(classname){
					result.push(classname)
				}
			}
		}
		callback(result.join(" "))
	}

	return binder
}