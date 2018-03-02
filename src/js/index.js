/* global browser */

const DEBUG = false;
const ROOT_FOLDER = { title: 'Bookmarks', id: null };
const ICON_SERVICE_URL = 'https://borychowski.org/icon/?url=';
// const THUMB_SERVICE_URL = 'https://api.letsvalidate.com/v1/thumbs/?width=256&height=256&url=';
const THUMB_SERVICE_URL = 'https://api.letsvalidate.com/v1/thumbs/?url=';

let btnBack, titleEl, bookmarksEl, currentFolderId, settings;
const defaults = {
	gridwidth: 968,
	gridgap: 74,
	iconradius: 10,
	showlabels: true,
	iconsize: '74',
	pagebg: '#eee',
	pagecolor: '#444',
	rootfolder: 'speeddial',
	mode: 'icons',
};



function log () {
	if (DEBUG) console.log.apply(console, arguments);
}


function printInstructions () {
	titleEl.innerHTML = `Create a folder <b>${settings.rootfolder}</b> in your bookmarks, to see links here or edit settings.`;
}


function letterIcon (item) {
	log(5, 'setting letter icon', item);
	const el = document.querySelector(`.item-${item.id} .thumb`);
	if (!el) return;
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


function fetchThumbIcon (url) {
	log(3, 'fetching thumb icon', url);
	const icon = THUMB_SERVICE_URL + url;
	setCachedIcon(url, icon);
	return Promise.resolve({ icon });
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
			if (!icon) {
				if (settings.mode === 'thumbs') return fetchThumbIcon(item.url);
				else return fetchIcon(item.url);
			}
			if (icon === 'letter') return letterIcon(item);
			return Promise.resolve({icon});
		})
		.then(res => {
			if (!res || !res.icon) throw 'Icon not found!';
			setItemIcon(item, res.icon);
		})
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


function printBookmarks (node) {
	btnBack.style.display = (node.id === ROOT_FOLDER.id ? 'none' : 'block');
	titleEl.innerText = node.title;
	bookmarksEl.innerHTML = node.children.map(getItemHtml).join('');
	window.ellipses('.item .title');
	return node.children;
}


function findSpeedDial (title = 'speeddial') {
	return browser.bookmarks
		.search({ title, url: undefined })
		.then(res => res.length && res[0])
		.then(res => {
			if (!res) return;
			ROOT_FOLDER.id = res.id;
			ROOT_FOLDER.title = res.title;
			return res.id;
		});
}


function logState (id) {
	if (history.state && history.state.id && history.state.id === id) return;
	const fn = (id === ROOT_FOLDER.id) ? 'replaceState' : 'pushState';
	window.history[fn]({ id }, document.title, '');
}


function readFolder (folderId, skipState = false) {
	if (!folderId) {
		printInstructions();
		return Promise.resolve();
	}
	currentFolderId = folderId;
	if (skipState !== true) logState(folderId);

	return browser.bookmarks
		.getSubTree(folderId)
		.then(tree => tree[0])
		.then(printBookmarks)
		.then(items => items.map(updateItemThumb));
}


function goBack () {
	if (!currentFolderId || currentFolderId === ROOT_FOLDER.id) return;
	history.back();
}


function onClick (e) {
	const target = e.target.closest('.folder');
	if (target) {
		e.preventDefault();
		readFolder(target.getAttribute('href'));
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
		document.documentElement.style.setProperty('--grid-width', settings.gridwidth + 'px');
		document.documentElement.style.setProperty('--grid-gap', settings.gridgap + 'px');
		document.documentElement.style.setProperty('--show-labels', settings.showlabels ? 'block' : 'none');

		findSpeedDial(settings.rootfolder)
			.then(id => {
				if (!ROOT_FOLDER.id) return printInstructions();
				if (history.state && history.state.id) id = history.state.id;
				readFolder(id);
			});
	});

	window.onpopstate = e => { if (e.state && e.state.id) readFolder(e.state.id, true); };
}



init();
