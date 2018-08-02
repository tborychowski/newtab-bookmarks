/* global browser */

const ROOT_FOLDER = { title: 'Bookmarks', id: null };
const ICON_SERVICE_URL = 'https://borychowski.org/icon/beta2.php?url=';
const THUMB_SERVICE_URL = 'https://api.letsvalidate.com/v1/thumbs/?url=';

const colorHash = new window.ColorHash();
let btnBack, titleEl, bookmarksEl, currentFolderId, settings;
const defaults = {
	gridwidth: 968,
	gridgap: 74,
	iconradius: 10,
	showlabels: true,
	iconsize: 74,
	pagebg: '#eee',
	pagecolor: '#444',
	rootfolder: 'Other Bookmarks',
	mode: 'icons',
};


function isDark (color) {
	const hex = color.replace('#', '');
	const c_r = parseInt(hex.substr(0, 2), 16);
	const c_g = parseInt(hex.substr(2, 2), 16);
	const c_b = parseInt(hex.substr(4, 2), 16);
	const brightness = ((c_r * 299) + (c_g * 587) + (c_b * 114)) / 1000;
	return brightness < 80;
}


function printInstructions () {
	titleEl.innerHTML = `Create a folder <b>${settings.rootfolder}</b> in your bookmarks, to see links here or edit settings.`;
}


function letterIcon (item) {
	const el = document.querySelector(`.item-${item.id} .thumb`);
	if (!el) return;
	el.classList.add('letter-thumb');
	const bg = colorHash.hex(item.url.replace(/(^https?:\/\/)|(\/$)/g, ''));
	el.style.backgroundColor = bg;
	el.style.color = isDark(bg) ? '#ccc' : '#333';
	el.innerText = item.title.substr(0, 1).toUpperCase();
}


function setItemIcon (item, icon) {
	const el = document.querySelector(`.item-${item.id} .thumb`);
	if (el && el.style) {
		if (item.type === 'folder') el.style.maskImage = `url(${icon})`;
		else el.style.backgroundImage = `url(${icon})`;
	}
}


function getCachedIcon (url) {
	url = getBaseUrl(url);
	return browser.storage.local.get(url).then(res => res[url] || '');
}


function setCachedIcon (url, iconUrl) {
	if (!iconUrl) return;
	const item = {};
	item[getBaseUrl(url)] = iconUrl;
	return browser.storage.local.set(item);
}


function fetchThumbIcon (url) {
	const icon = THUMB_SERVICE_URL + url;
	setCachedIcon(url, icon);
	return Promise.resolve({ icon });
}


function updateItemThumb (item) {
	if (item.type !== 'bookmark') {
		setItemIcon(item, '../img/folder.svg');
		return item;
	}
	getCachedIcon(item.url)
		.then(icon => {
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


function getBaseUrl (url) {
	let baseUrl;
	try { baseUrl = new URL(url); }
	catch (e) { baseUrl = {}; }
	return (baseUrl.origin || url).replace(/\/$/, '') + (baseUrl.pathname || '').replace(/\/$/, '');
}



function fetchIcon (url) {
	url = getBaseUrl(url);
	return fetch(ICON_SERVICE_URL + url)
		.then(res => res.json())
		.then(res => {
			setCachedIcon(url, res.icon);
			return Promise.resolve(res);
		})
		.catch(() => {
			setCachedIcon(url, 'letter');
		});
}



// type, title, url
function getItemHtml (item) {
	if (item.type === 'separator') return '<div class="item separator"></div>';
	if (item.url && item.url.indexOf('http') > 0) {
		item.url = item.url.substr(item.url.indexOf('http'));
		item.url = decodeURIComponent(item.url);
	}
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

/**
 * Push new state to history
 */
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
	const folder = e.target.closest('.folder');
	if (folder) {
		e.preventDefault();
		readFolder(folder.getAttribute('href'));
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
		document.documentElement.style.setProperty('--show-labels', settings.showlabels ? 'flex' : 'none');

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
