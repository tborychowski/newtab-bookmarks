/* global browser */

const ROOT_FOLDER = 'Bookmarks';
let btnBack, titleEl, bookmarksEl, rootFolderId, currentFolderId;

function printInstructions () {
	titleEl.innerHTML = 'Create a folder <b>speeddial</b> in your bookmarks, to see links here';
}

// type, title, url
function getItemHtml (item) {
	let thumb = '<span class="thumb">📁</span>';
	if (item.type === 'bookmark') {
		const thumbUrl = `https://icon-fetcher-go.herokuapp.com/icon?size=80&url=${item.url}`;
		thumb = `<span class="thumb" style="background-image: url(${thumbUrl})"></span>`;
	}
	return `<a href="${item.url || item.id}" class="item ${item.type}">
		${thumb}<span class="title">${item.title}</span></a>`;
}


function printBookmarks (title, items) {
	btnBack.style.display = (title === ROOT_FOLDER ? 'none' : 'block');
	titleEl.innerText = title;
	bookmarksEl.innerHTML = items.map(getItemHtml).join('');
}


function findSpeedDial () {
	return browser.bookmarks
		.search({ title: 'speeddial', url: undefined })
		.then(res => res && res.length && res[0].id);
}


function readFolder (folderId, title = ROOT_FOLDER) {
	if (!folderId) return;
	currentFolderId = folderId;
	browser.bookmarks
		.getSubTree(folderId)
		.then(tree => tree[0].children)
		.then(items => printBookmarks(title, items));
}

function goBack () {
	if (!currentFolderId || currentFolderId === rootFolderId) return;
	browser.bookmarks
		.get(currentFolderId)
		.then(item => {
			if (item && item.length) readFolder(item[0].parentId);
		});
}

function onClick (e) {
	const target = e.target.closest('.folder');
	if (target) {
		e.preventDefault();
		const id = target.getAttribute('href');
		if (id) readFolder(id, target.querySelector('.title').innerText);
	}
}

function init () {
	findSpeedDial()
		.then(id => {
			if (!id) return printInstructions();
			rootFolderId = id;
			readFolder(id, ROOT_FOLDER);
		});
	btnBack = document.querySelector('.btn-back');
	titleEl = document.querySelector('.title');
	bookmarksEl = document.querySelector('.bookmarks');

	document.addEventListener('click', onClick);
	btnBack.addEventListener('click', goBack);
}

init();
