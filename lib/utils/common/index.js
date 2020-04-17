[
	'spinner',
	'logger',
	'chop',
	'capital'
].forEach(m => {
	Object.assign(exports, require(`./${m}`))
})