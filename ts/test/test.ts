import {WBox, box} from "@nartallax/cardboard"
import {tag} from "src/functions/html_tag"
import {waitDocumentLoaded} from "src/functions/wait_document_loaded"
import css from "./test.module.scss"
import {testCases} from "test/test_cases"
import {initializeCardboardDom} from "src/node_binding"

export async function main() {
	await waitDocumentLoaded()
	await initializeCardboardDom()
	renderAll()
}

function renderAll() {
	document.body.innerHTML = ""

	const getCaseScore = (c: (typeof testCasesWithResult)[number]) => {
		return c.finished instanceof Error ? 2 : c.finished === true ? 0 : 1
	}

	const sortCases = () => {
		const cases = [...casesBox.get()]
		cases.sort((a, b) => {
			return (getCaseScore(b) - getCaseScore(a)) || (a.name < b.name ? -1 : 1)
		})
		casesBox.set(cases)
	}

	const testCasesWithResult = testCases.map(testCase => ({...testCase, finished: false as boolean | Error}))
	const casesBox = box(testCasesWithResult)

	sortCases()

	const root = tag({class: css.testTable}, [
		casesBox.mapArray(
			testCase => testCase.name,
			testCaseBox => tag({class: css.testRow}, [
				tag({class: css.testEntryName}, [testCaseBox.prop("name")]),
				renderTester(testCaseBox.get().tester, testCaseBox.prop("finished"), sortCases)
			])
		)
	])
	document.body.appendChild(root)
}

function renderTester(tester: () => void | Promise<void>, resultBox: WBox<boolean | Error>, onCompletion: () => void): HTMLElement {
	requestAnimationFrame(() => {
		(async() => {
			try {
				await Promise.resolve(tester())
				resultBox.set(true)
			} catch(e){
				if(!(e instanceof Error)){
					throw e
				}
				console.error(e)
				resultBox.set(e)
			}
			onCompletion()
		})()
	})

	const el = tag({
		class: [css.testEntryResult, {
			[css.success!]: resultBox.map(result => result === true),
			[css.failure!]: resultBox.map(result => result instanceof Error),
			[css.pending!]: resultBox.map(result => result === false)
		}]
	}, [
		resultBox.map(result => result === false ? "<pending>" : result === true ? "success" : (result + ""))
	])

	return el
}

main()