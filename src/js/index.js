/* global browser */

const ROOT_FOLDER = 'Bookmarks';
const ICON_SERVICE_URL = 'https://icon-service.borychowski.org/?url=';
const ICON_SERVICE_URL_FALLBACK = 'https://besticon-demo.herokuapp.com/icon?size=40..80..180&url=';
const FALLBACK_TIMEOUT = 3000;

let btnBack, titleEl, bookmarksEl, rootFolderId, currentFolderId;



// Fetch with timeout
function _fetch (url) {
	return new Promise((resolve, reject) => {
		setTimeout(() => reject(), FALLBACK_TIMEOUT);
		fetch(url).then(resolve, reject);
	});
}


function printInstructions () {
	titleEl.innerHTML = 'Create a folder <b>speeddial</b> in your bookmarks, to see links here';
}

// improve this
function getBestThumb (thumbs) {
	return thumbs.filter(i => !!i.active)[0].href;
}

function storeThumb (item) {
	const store = {};
	store[item.id] = item.thumbUrl;
	browser.storage.local.set(store);
	return item;
}


function getItemThumb (item) {
	if (item.type !== 'bookmark') item.thumbUrl = '../img/folder.svg';
	if (item.thumbUrl) return Promise.resolve(item);

	//TODO: add setting to use the alt service
	return _fetch(ICON_SERVICE_URL + item.url)
		.then(res => res.json())
		.then(res => {
			const thumb = getBestThumb(res);
			item.thumbUrl = thumb || (ICON_SERVICE_URL_FALLBACK + item.url);
			if (thumb) storeThumb(item);
			return item;
		})
		.catch(() => {
			item.thumbUrl = ICON_SERVICE_URL_FALLBACK + item.url;
			return item;
		});
}


function getItemsThumbs (items) {
	return browser.storage.local.get()
		.then(storageItems => {
			if (!storageItems || !Object.keys(storageItems).length) titleEl.innerText = 'Loading...';
			items.forEach(i => i.thumbUrl = storageItems[i.id]);
			return Promise.all(items.map(getItemThumb));
		});
}




// type, title, url
function getItemHtml (item) {
	return `<a href="${item.url || item.id}" class="item ${item.type}">
		<span class="thumb" style="background-image: url(${item.thumbUrl || ''})"></span>
		<span class="title" title="${item.title}">${item.title}</span>
	</a>`;
}


function printBookmarks (title, items) {
	btnBack.style.display = (title === ROOT_FOLDER ? 'none' : 'block');
	titleEl.innerText = title;
	bookmarksEl.innerHTML = items.map(getItemHtml).join('');
	window.ellipses('.item .title');
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
		.then(getItemsThumbs)
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


	findSpeedDial()
		.then(id => {
			if (!id) return printInstructions();
			rootFolderId = id;
			readFolder(id, ROOT_FOLDER);
		});
}


init();
