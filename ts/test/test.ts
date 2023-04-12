import {box} from "@nartallax/cardboard"
import {tag} from "src/tag"
import {waitDocumentLoaded} from "src/wait_document_loaded"
import css from "./test.module.scss"
import {testCases} from "test/test_cases"

export async function main() {
	await waitDocumentLoaded()
	renderAll()
}

function renderAll() {
	document.body.innerHTML = ""
	const root = tag({class: css.testTable},
		testCases.map(({name, tester}) => [
			tag({class: css.testEntryName}, [name]),
			renderTester(tester)
		]).flat()
	)
	document.body.appendChild(root)
}

function renderTester(tester: () => void | Promise<void>): HTMLElement {
	const testResult = box<true | Error | null>(null);

	(async() => {
		try {
			await Promise.resolve(tester())
			testResult(true)
		} catch(e){
			if(!(e instanceof Error)){
				throw e
			}
			console.error(e)
			testResult(e)
		}
	})()

	const el = tag({
		class: [css.testEntryResult, {
			[css.success!]: testResult.map(result => result === true),
			[css.failure!]: testResult.map(result => result instanceof Error),
			[css.pending!]: testResult.map(result => result === null)
		}]
	}, [
		testResult.map(result => result === null ? "<pending>" : result === true ? "success" : (result + ""))
	])

	return el
}

main()