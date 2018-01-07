/* global browser */


// type, title, url
function getItemHtml (item) {
	let thumb = '<span class="thumb">📁</span>';
	if (item.type === 'bookmark') {
		const thumbUrl = `https://icon-fetcher-go.herokuapp.com/icon?size=80&url=${item.url}`;
		thumb = `<span class="thumb" style="background-image: url(${thumbUrl})"></span>`;
	}
	return `<a href="${item.url}" class="item ${item.type}">
		${thumb}<span class="title">${item.title}</span></a>`;
}



function printBookmarks (items) {
	const el = document.querySelector('.bookmarks');
	el.innerHTML = items.map(getItemHtml).join('');
}


browser
	.bookmarks
	.getSubTree('unfiled_____')
	.then(tree => tree[0].children)
	.then(items => {
		const speeddial = items.find(i => i.title === 'speeddial' && i.type === 'folder');
		if (speeddial) printBookmarks(speeddial.children);
	});
