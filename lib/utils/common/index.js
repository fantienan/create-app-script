[
	'spinner',
	'logger'
].forEach(m => {
	Object.assign(exports, require(`./${m}`))
})