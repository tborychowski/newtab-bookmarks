/* global browser */

const ROOT_FOLDER = { title: 'Bookmarks', id: null };
const ICON_SERVICE_URL = 'https://borychowski.org/icon/?url=';
const THUMB_SERVICE_URL = 'https://api.letsvalidate.com/v1/thumbs/?url=';
//favicongrabber.com/api/grab/github.com


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


function printInstructions () {
	titleEl.innerHTML = `Create a folder <b>${settings.rootfolder}</b> in your bookmarks, to see links here or edit settings.`;
}


function letterIcon (item) {
	const el = document.querySelector(`.item-${item.id} .thumb`);
	if (!el) return;
	el.classList.add('letter-thumb');
	el.innerText = item.title.substr(0, 1).toUpperCase();
}


function setItemIcon (item, icon) {
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


// type, title, url
function getItemHtml (item) {
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





function getBaseUrl (url) {
	let baseUrl;
	try { baseUrl = new URL(url); }
	catch (e) { baseUrl = {}; }
	return (baseUrl.origin || url).replace(/\/$/, '');
}

function findIconUrlInMeta (baseUrl, el) {
	const iconUrl = el.getAttribute('href') || el.getAttribute('content');
	if (!iconUrl) return '';
	if (iconUrl.indexOf('http') === 0) return iconUrl;
	if (iconUrl.indexOf('//') === 0) return 'https:' + iconUrl;
	if (iconUrl.indexOf('data:image/') === 0) return iconUrl;
	return baseUrl + '/' + iconUrl.replace(/^\//, '');
}

function findIconSizeInMeta (el) {
	let size = el.getAttribute('sizes');
	if (!size) {
		const url = el.getAttribute('href') || el.getAttribute('content');
		const matches = /\d{2,3}x\d{2,3}/.exec(url);
		if (matches && matches.length) size = matches[0];
	}
	if (size) return parseInt(size.split('x')[0], 10);
	return 0;
}

function getIconsFromMeta (links, finalUrl) {
	const icons = [];
	Array.from(links).forEach(lnk => {
		const type = lnk.getAttribute('rel') || lnk.getAttribute('property');
		if (!type) return;
		const icon = {
			size: findIconSizeInMeta(lnk),
			url: findIconUrlInMeta(finalUrl, lnk)
		};
		if (type.indexOf('icon') > -1) icon.type = 'icon';
		else if (type.indexOf('apple-touch') > -1) icon.type = 'apple';
		else if (type.indexOf('msapplication-TileImage') > -1) icon.type = 'ms';
		else if (type === 'og:image') icon.type = 'og';
		else if (type === 'og:image:width') {
			const size = lnk.getAttribute('content');
			if (size) icons[icons.length - 1].size = parseInt(size, 10);
		}
		if (icon.type) icons.push(icon);
	});
	return icons;
}


function getIcons (url) {
	let finalUrl = url;
	return fetch(url, { redirect: 'follow' })
		.then(res => {
			finalUrl = getBaseUrl(res.url);
			return res.text();
		})
		.then(res => findIconsInHtml(res, finalUrl))
		.catch(() => getFallbackIcon(url));
}


function findIconsInHtml (res, finalUrl) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(res, 'text/html');
	if (!doc.head) throw new Error('Error parsing URL');
	const head = doc.head;
	const icons = getIconsFromMeta(head.querySelectorAll('link,meta'), finalUrl);
	if (icons.length) return { url: finalUrl, icon: getClosestTo(icons) };
	return getFavicon(finalUrl);
}


function getFavicon (finalUrl) {
	return fetch(finalUrl + '/favicon.ico')
		.then(resp => {
			if (resp.status === 200) return { url: finalUrl, icon: finalUrl + '/favicon.ico' };
			throw new Error('Icon not found');
		});
}


function getFallbackIcon (url) {
	return fetch(ICON_SERVICE_URL + url).then(res => res.json())
}



function getClosestTo (icons, size = 120) {
	if (!Array.isArray(icons)) icons = [icons];
	let icon = icons[0], dist = null;
	icons.forEach(i => {
		const d = Math.abs(size - i.size);
		if (dist !== null && d >= dist) return;
		dist = d;
		icon = i;
	});
	return icon.url || '';
}



function fetchIcon (url) {
	url = getBaseUrl(url);
	return getIcons(url)
		.then(res => {
			setCachedIcon(url, res.icon);
			return Promise.resolve(res);
		})
		.catch(() => {
			setCachedIcon(url, 'letter');
		});
}


// const DELAY = 1000;
// openTab('https://forgeofempires.com/').then(screenshotTab).then(closeTab);


// function closeTab (tab) {
// 	return browser.tabs.remove(tab.id);
// }

// function screenshotTab (tab) {
// 	return new Promise (resolve => {
// 		setTimeout(() => {
// 			browser.tabs.captureTab(tab.id, { format: 'jpeg', quality: 85 }).then(img => {
// 				document.querySelector('.thumb').style.backgroundImage = `url(${img})`;
// 				console.log(('' + img).length / 1024);
// 				resolve(tab);
// 			});
// 		}, DELAY);
// 	});
// }

// function openTab (url) {
// 	return new Promise (resolve => {
// 		browser.tabs
// 			.create({ url, active: false })
// 			.then(tab => {
// 				if (browser.tabs.hide) browser.tabs.hide(tab.id);
// 				browser.tabs
// 					.onUpdated
// 					.addListener((tabId, ev, newTab) => {
// 						if (tabId === tab.id && ev.status === 'complete') resolve(newTab);
// 					});
// 			});
// 	});
// }


