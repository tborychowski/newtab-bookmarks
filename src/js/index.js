/* global browser */

const ROOT_FOLDER = 'Bookmarks';
// const ICON_SERVICE_URL = 'https://besticon-demo.herokuapp.com/icon?size=40..70..200&url=';
const ICON_SERVICE_URL = 'https://icon-fetcher-go.herokuapp.com/icon?size=40..70..200&url=';

let btnBack, titleEl, bookmarksEl, rootFolderId, currentFolderId, settings;
const defaults = {
	iconradius: 10,
	iconsize: '74',
	pagebg: '#eee',
	pagecolor: '#444',
	rootfolder: 'speeddial',
};


function printInstructions () {
	titleEl.innerHTML = `Create a folder <b>${settings.rootfolder}</b> in your bookmarks, to see links here`;
}


function getItemThumb (item) {
	if (item.type !== 'bookmark') return '../img/folder.svg';
	return ICON_SERVICE_URL + item.url;
}


// type, title, url
function getItemHtml (item) {
	const thumb = getItemThumb(item);
	return `<a href="${item.url || item.id}" class="item ${item.type}">
		<span class="thumb" style="background-image: url(${thumb})"></span>
		<span class="title" title="${item.title}">${item.title}</span>
	</a>`;
}


function printBookmarks (title, items) {
	btnBack.style.display = (title === ROOT_FOLDER ? 'none' : 'block');
	titleEl.innerText = title;
	bookmarksEl.innerHTML = items.map(getItemHtml).join('');
	window.ellipses('.item .title');
}


function findSpeedDial (title = 'speeddial') {
	return browser.bookmarks
		.search({ title, url: undefined })
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
	btnBack = document.querySelector('.btn-back');
	titleEl = document.querySelector('.title');
	bookmarksEl = document.querySelector('.bookmarks');


	document.addEventListener('click', onClick);
	btnBack.addEventListener('click', goBack);


	browser.storage.local.get('settings').then(store => {
		settings = Object.assign({}, defaults, store.settings);

		document.documentElement.style.setProperty('--color', settings.pagecolor);
		document.documentElement.style.setProperty('--bg', settings.pagebg);
		document.documentElement.style.setProperty('--icon-size', settings.iconsize + 'px');
		document.documentElement.style.setProperty('--icon-radius', settings.iconradius + 'px');

		findSpeedDial(settings.rootfolder)
			.then(id => {
				if (!id) return printInstructions();
				rootFolderId = id;
				readFolder(id, ROOT_FOLDER);
			});
	});
}


init();
