/**
 * Borrowed from brilliant ellipsed package
 * https://github.com/nzambello/ellipsed
 */

function tokensReducer(acc, token) {
	const {el, elStyle, elHeight, rowsLimit, rowsWrapped } = acc;
	if (rowsWrapped === rowsLimit + 1) return { ...acc };
	const textBeforeWrap = el.textContent;
	let newRowsWrapped = rowsWrapped;
	let newHeight = elHeight;
	el.innerText = (el.innerText.length ? `${el.innerText} ` : '') + `${token}...`;
	if (parseFloat(elStyle.height) > parseFloat(elHeight)) {
		newRowsWrapped++;
		newHeight = elStyle.height;
		if (newRowsWrapped === rowsLimit + 1) {
			const endsWithDot = textBeforeWrap[textBeforeWrap.length - 1] === '.';
			el.innerText = textBeforeWrap + (endsWithDot ? '..' : '...');
			return { ...acc, elHeight: newHeight, rowsWrapped: newRowsWrapped };
		}
	}
	el.textContent = (textBeforeWrap.length ? `${textBeforeWrap} ` : '') + token;
	return { ...acc, elHeight: newHeight, rowsWrapped: newRowsWrapped };
}

function ellipsis (el, rows) {
	const splittedText = el.innerText.split(' ');
	el.innerHTML = '';
	const elStyle = window.getComputedStyle(el);
	splittedText.reduce(tokensReducer, {
		el,
		elStyle,
		elHeight: 0,
		rowsLimit: rows,
		rowsWrapped: 0,
	});

}

function ellipses(selector = '', rows = 2) {
	document.querySelectorAll(selector).forEach(el => ellipsis(el, rows));
}