/* global browser */

const DEBUG = false;
const ROOT_FOLDER = 'Bookmarks';
// const ICON_SERVICE_URL = 'https://besticon-demo.herokuapp.com/icon?size=40..70..200&url=';
// const ICON_SERVICE_FALLBACK_URL = 'https://icon-fetcher-go.herokuapp.com/icon?size=40..120..256&url=';
const ICON_SERVICE_URL = 'https://borychowski.org/icon/?url=';

let btnBack, titleEl, bookmarksEl, rootFolderId, currentFolderId, settings;
const defaults = {
	iconradius: 10,
	iconsize: '74',
	pagebg: '#eee',
	pagecolor: '#444',
	rootfolder: 'speeddial',
};

function log () {
	if (DEBUG) console.log.apply(console, arguments);
}

function printInstructions () {
	titleEl.innerHTML = `Create a folder <b>${settings.rootfolder}</b> in your bookmarks, to see links here`;
}


function letterIcon (item) {
	log(5, 'setting letter icon', item);
	const el = document.querySelector(`.item-${item.id} .thumb`);
	el.classList.add('letter-thumb');
	el.innerText = item.title.substr(0, 1).toUpperCase();
}

function setItemIcon (item, icon) {
	log(5, 'setting icon', item, icon);
	const el = document.querySelector(`.item-${item.id} .thumb`);
	el.style.backgroundImage = `url(${icon})`;
}

function getDomainFromUrl (url) {
	let parsed;
	try { parsed = new URL(url); }
	catch (e) { parsed = {}; }
	return parsed.host;
}

function getCachedIcon (url) {
	url = getDomainFromUrl(url);
	return browser.storage.local.get(url).then(res => res[url] || null);
}

function setCachedIcon (url, iconUrl) {
	const item = {};
	item[getDomainFromUrl(url)] = iconUrl;
	return browser.storage.local.set(item);
}


function fetchIcon (url) {
	log(3, 'fetching icon', url);
	return fetch(ICON_SERVICE_URL + url)
		.then(res => res.json())
		.then(res => {
			log(4, 'received icon', url, res);
			setCachedIcon(url, res.icon);
			return Promise.resolve(res);
		})
		.catch(() => {
			log(4, 'icon not received', url);
			setCachedIcon(url, 'letter');
		});
}


function updateItemThumb (item) {
	log(1, 'updting thumb', item);
	if (item.type !== 'bookmark') {
		setItemIcon(item, '../img/folder.svg');
		return item;
	}
	getCachedIcon(item.url)
		.then(icon => {
			log(2, 'cached icon', item.title, icon);
			if (!icon) return fetchIcon(item.url);
			if (icon === 'letter') return letterIcon(item);
			return Promise.resolve({icon});
		})
		.then(res => {
			if (!res || !res.icon) throw 'Icon not found!';
			setItemIcon(item, res.icon);
		})
		// .catch(() => setItemIcon(item, ICON_SERVICE_FALLBACK_URL + item.url));
		.catch(() => {
			setCachedIcon(item.url, 'letter');
			letterIcon(item);
		});
	return item;
}


// type, title, url
function getItemHtml (item) {
	return `<a href="${item.url || item.id}" class="item ${item.type} item-${item.id}">
		<span class="thumb"></span>
		<span class="title" title="${item.title}">${item.title}</span>
	</a>`;
}


function printBookmarks (title, items) {
	btnBack.style.display = (title === ROOT_FOLDER ? 'none' : 'block');
	titleEl.innerText = title;
	bookmarksEl.innerHTML = items.map(getItemHtml).join('');
	window.ellipses('.item .title');
	return items;
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
		.then(items => printBookmarks(title, items))
		.then(items => items.map(updateItemThumb));
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
		settings = Object.assign({}, defaults, store.settings || {});

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
