function checkAndReplace(
	node: Node,
	token: string,
	className: string,
	sensitiveSearch: boolean,
) {
	let nodeVal = node.nodeValue
	let elements = []

	let isFirst = true
	while (true) {
		let foundIndex

		if (sensitiveSearch) foundIndex = nodeVal.indexOf(token)
		else foundIndex = nodeVal.toLowerCase().indexOf(token.toLowerCase())

		if (foundIndex < 0) {
			if (isFirst) break

			if (nodeVal) {
				const span = document.createElement('span')
				span.appendChild(document.createTextNode(nodeVal))
				elements.push(span)
			}

			break
		}

		isFirst = false

		let begin = nodeVal.substring(0, foundIndex)
		let matched = nodeVal.substr(foundIndex, token.length)

		if (begin) {
			const span = document.createElement('span')
			span.appendChild(document.createTextNode(begin))
			elements.push(span)
		}

		const span = document.createElement('span')
		span.className = className
		span.appendChild(document.createTextNode(matched))
		elements.push(span)

		nodeVal = nodeVal.substring(foundIndex + token.length)
	}
	return elements
}

function iterator(
	p: Node,
	token: string,
	allClassName: string,
	allSensitiveSearch: boolean,
) {
	if (p === null) return

	let children = Array.prototype.slice.call(p.childNodes),
		i,
		cur

	if (children.length) {
		for (i = 0; i < children.length; i++) {
			cur = children[i]
			if (cur.nodeType === 3) {
				checkAndReplace(cur, token, allClassName, allSensitiveSearch)
			} else if (cur.nodeType === 1) {
				iterator(cur, token, allClassName, allSensitiveSearch)
			}
		}
	}
}

document.designMode = 'on'

const findTextNodes = (rootNode: Node): Node[] => {
	const textNodes = []

	let children = Array.prototype.slice.call(rootNode.childNodes),
		i,
		cur

	if (children.length) {
		for (i = 0; i < children.length; i++) {
			cur = children[i]
			if (cur.nodeType === 3) {
				textNodes.push(cur)
			} else if (cur.nodeType === 1) {
				textNodes.push(...findTextNodes(cur))
			}
		}
	}

	return textNodes
}

interface TextNode {
	node: Node
	current: Node
	original: Node
	originalParent: Node
}

// @ts-ignore
new Vue({
	el: '#vue',
	data: {
		searchPattern: '',
		matched: null,
		selection: null,
		keys: {
			'Meta': false,
			'Alt': false,
			'Control': false,
			'Shift': false,
			'd': false,
			'l': false,
			'k': false,
			'ArrowUp': false,
			'ArrowRight': false,
			'ArrowDown': false,
			'ArrowLeft': false,
		},
		textNodes: {},
	},
	methods: {
		search: function(token: string) {
			const className = 'highlight'
			const sensitiveSearch = false
			let matchedElements: [Node, Node[], number][]

			if (token !== '') {
				Object.values(this.textNodes).forEach((node: TextNode, i) => {
					const selection = checkAndReplace(
						node.original,
						token,
						className,
						sensitiveSearch,
					)
					const toRemove: number[] = []

					if (selection.length > 0) {
						const span = document.createElement('span')
						selection.forEach((element, i) => {
							if (
								i > 0 &&
								(element.className === 'highlight' &&
									selection[i - 1].className === 'highlight')
							) {
								span.lastChild.textContent = `${span.lastChild.textContent}${element.textContent}`
								toRemove.push(i)
							} else {
								span.appendChild(element)
							}
						})

						node.current = span

						const parent = document.querySelector(
							'[data-highlight="' + i + '"]',
						)
						const spanElement = document.createElement('span')
						spanElement.appendChild(span)

						parent.textContent = ''
						parent.appendChild(spanElement)
					}

					const filteredSelection = selection.filter((ele, i) => {
						if (toRemove.includes(i)) {
							return false
						} else {
							return true
						}
					})

					if (matchedElements === undefined) {
						matchedElements = [[node.current, filteredSelection, i]]
					} else {
						matchedElements.push([
							node.current,
							filteredSelection,
							i,
						])
					}
				})
			}

			this.matched = matchedElements
		},
		deselect: function() {
			const highlights = document.querySelectorAll('.highlight')
			const parents = Array.from(highlights).map(
				ele => ele.parentElement.parentElement,
			)

			const uniqueParents = new Set(parents)

			uniqueParents.forEach((parent: HTMLSpanElement) => {
				const id = parent.getAttribute('data-highlight')

				parent.removeChild(this.textNodes[id].current)
				parent.appendChild(this.textNodes[id].original)

				this.textNodes[id].current = this.textNodes[id].original
				this.textNodes[id].node = this.textNodes[id].current
			})
		},
		indexTextNodes: function() {
			let idIndex = 0

			const rootNode = document.body
			const nodes = findTextNodes(rootNode)

			nodes.forEach(node => {
				console.log(node.textContent, idIndex)

				const span = document.createElement('span')
				span.setAttribute('data-highlight', idIndex.toString())
				span.appendChild(node.cloneNode(true))

				console.log(span)

				node.parentNode.replaceChild(span, node)
				//node.parentNode.setAttribute('data-highlight', idIndex)

				this.textNodes[idIndex] = {
					node,
					current: null,
					original: node.cloneNode(true),
					originalParent: node.parentNode
						? node.parentNode.cloneNode(true)
						: null,
				}

				idIndex++
			})
		},
		selectMatched: function() {
			this.matched.forEach(
				(
					textContainer: [HTMLSpanElement, HTMLSpanElement[], number],
				) => {
					textContainer[1].forEach((span: HTMLSpanElement) => {
						if (span.className === 'highlight') {
							span.className += ' selectedRight'
							span.setAttribute('data-focus', 'r')
						}
					})
				},
			)
		},
		outward: function(
			textContainer: [HTMLSpanElement, HTMLSpanElement[], number],
			i: number,
			direction: string,
		) {
			let newSelection

			if (direction === 'left' && i < textContainer[1].length) {
				const notWithinRange =
					i === 0 ||
					(i === 1 &&
						textContainer[1][i - 1].textContent.length === 1)

				if (notWithinRange) {
					console.log(
						document.querySelector(
							'[data-highlight="' + (textContainer[2] - 1) + '"]',
						),
					)
				}

				if (
					!notWithinRange &&
					textContainer[1][i - 1].textContent.slice(-1) === ' ' &&
					i !== textContainer[1].length
				) {
					newSelection = ` ${textContainer[1][i].textContent}`
				} else if (!notWithinRange && i !== textContainer[1].length) {
					newSelection = `${textContainer[1][i - 1].textContent.slice(
						-1,
					)}${textContainer[1][i].textContent}`
				}

				if (newSelection !== undefined) {
					textContainer[1][i].textContent = newSelection
				}

				if (
					!notWithinRange &&
					textContainer[1][i - 1].textContent.length > 1
				) {
					textContainer[1][i - 1].textContent = textContainer[1][
						i - 1
					].textContent.slice(0, -1)
				} else if (
					!notWithinRange &&
					textContainer[1][i - 1].textContent.length === 1
				) {
					textContainer[1][i - 1].remove()
					textContainer[1][
						i - 2
					].textContent = `${textContainer[1][i - 2].textContent}${textContainer[1][i].textContent}`
					textContainer[1][i].remove()
				}
			} else if (direction === 'right') {
				const withinRange = i + 1 < textContainer[1].length - 1

				if (i + 2 === textContainer[1].length) {
					console.log('hit border!')
				}

				if (
					withinRange &&
					textContainer[1][i + 1].textContent[0] === ' '
				) {
					newSelection = `${textContainer[1][i].textContent} `
				} else if (withinRange) {
					newSelection = `${textContainer[1][i].textContent}${textContainer[1][i + 1].textContent[0]}`
				}

				if (newSelection !== undefined) {
					textContainer[1][i].textContent = newSelection
				}

				if (
					withinRange &&
					textContainer[1][i + 1].textContent.length > 1
				) {
					textContainer[1][i + 1].textContent = textContainer[1][
						i + 1
					].textContent.slice(1)
				} else if (
					withinRange &&
					textContainer[1][i + 1].textContent.length === 1
				) {
					textContainer[1][i + 1].remove()
					textContainer[1][
						i + 2
					].textContent = `${textContainer[1][i].textContent}${textContainer[1][i + 2].textContent}`
					textContainer[1][i].remove()
				}
			}

			return textContainer
		},
		inward: function(
			textContainer: [HTMLSpanElement, HTMLSpanElement[], number],
			i: number,
			direction: string,
		) {
			if (direction === 'left') {
				textContainer[1][i + 1].textContent = `${textContainer[1][
					i
				].textContent.slice(-1)}${textContainer[1][i + 1].textContent}`
				textContainer[1][i].textContent = textContainer[1][
					i
				].textContent.slice(0, -1)
			} else if (direction === 'right') {
				textContainer[1][i - 1].textContent = `${
					textContainer[1][i - 1].textContent
				}${textContainer[1][i].textContent.charAt(0)}`
				textContainer[1][i].textContent = textContainer[1][
					i
				].textContent.slice(1)
			}

			if (textContainer[1][i].textContent.length === 0) {
				textContainer[1][i].setAttribute('data-focus', 'c')
			}

			return textContainer
		},
		moveSelection: function(direction: string) {
			this.matched.forEach(
				(
					textContainer: [HTMLSpanElement, HTMLSpanElement[], number],
					index: number,
				) => {
					textContainer[1].forEach(
						(span: HTMLSpanElement, i: number) => {
							const { focus } = span.dataset

							if (
								span.className === 'highlight selectedRight' ||
								span.className === 'highlight selectedLeft'
							) {
								if (
									direction === 'r' &&
									(focus === 'r' || focus === 'c')
								) {
									span.setAttribute('data-focus', 'r')
									span.className = 'highlight selectedRight'
									textContainer = this.outward(
										textContainer,
										i,
										'right',
									)
								} else if (direction === 'l' && focus === 'r') {
									textContainer = this.inward(
										textContainer,
										i,
										'left',
									)
								} else if (
									(direction === 'l' && focus === 'l') ||
									focus === 'c'
								) {
									span.setAttribute('data-focus', 'l')
									span.className = 'highlight selectedLeft'
									textContainer = this.outward(
										textContainer,
										i,
										'left',
									)
								} else if (direction === 'r' && focus === 'l') {
									textContainer = this.inward(
										textContainer,
										i,
										'right',
									)
								}
							}
							this.matched[index][1] = Array.from(
								textContainer[0].children,
							)
						},
					)
					this.matched[index] = textContainer
				},
			)
		},
	},
	watch: {
		searchPattern: function(token: string) {
			this.selection = window.getSelection()

			this.deselect()
			this.search(token)
		},
	},
	mounted: function() {
		this.indexTextNodes()

		window.addEventListener('keydown', key => {
			const { keys } = this

			if (keys.hasOwnProperty(key.key)) {
				keys[key.key] = true
			}

			if (keys.Meta && keys.Control && keys.k) {
				this.searchPattern = window.getSelection().toString()
			}

			if (keys.Meta && keys.Shift && keys.l) {
				this.selectMatched()
			}

			if (keys.Shift && keys.ArrowRight && this.matched) {
				window.getSelection().removeAllRanges()
				this.moveSelection('r')
			}

			if (keys.Shift && keys.ArrowLeft && this.matched) {
				window.getSelection().removeAllRanges()
				this.moveSelection('l')
			}
		})

		window.addEventListener('keyup', key => {
			if (this.keys.hasOwnProperty(key.key)) {
				this.keys[key.key] = false
			}
		})

		window.addEventListener('click', () => {
			this.deselect()
			this.matched = null
		})

		document.onselectionchange = () => {
			//console.log(document.getSelection()
		}
	},
})
