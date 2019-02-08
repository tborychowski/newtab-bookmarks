/* global browser, Form, Toast */

let form;
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
	css: '',
};

const presetMap = {
	'icon-grid': {
		gridwidth: 968,
		gridgap: 74,
		iconradius: 10,
		showlabels: true,
		iconsize: 74,
		pagebg: '#eee',
		pagecolor: '#444',
		mode: 'icons',
		view: 'grid',
	},
	'metro-tiles': {
		gridwidth: 2000,
		gridgap: 5,
		iconradius: 0,
		showlabels: false,
		iconsize: 128,
		pagebg: '#eee url("https://picsum.photos/1800/1200/?random") 0 0/cover no-repeat',
		pagecolor: '#444',
		mode: 'thumbs',
		view: 'grid',
	},
};

let storedSettings = null;
const $ = s => document.querySelector(s);
const notify = () => new Toast('Settings saved', 'info');
const save = settings => browser.storage.local.set({ settings }).then(notify);


function updateInputValue (things) {
	if (things.pagecolor) document.body.style.color = things.pagecolor;
	if (things.pagebg) document.body.style.background = things.pagebg;

	Object.keys(things).forEach(name => {
		const tooltip = $(`.${name}-tooltip`);
		if (tooltip) tooltip.innerText = things[name];
	});
}

function onSubmit (e) {
	e.preventDefault();
	const newSettings = form.get();
	if (!storedSettings || storedSettings.mode === newSettings.mode) save(newSettings);
	else clearCache().then(() => save(newSettings));
	storedSettings = newSettings;
}

function reset (persist) {
	defaults.rootfolder = form.get().rootfolder;	// don't reset this!
	form.set(defaults);
	updateInputValue(defaults);
	if (persist === true) return save(defaults);
	else return Promise.resolve();
}



function clearCache () {
	return browser.storage.local.clear();
}


function initSettings () {
	browser.storage.local.get('settings').then(store => {
		storedSettings = store.settings || {};
		const merged = Object.assign({}, defaults, storedSettings);
		form.set(merged);
		updateInputValue(merged);
	});
}


function presetClick (e) {
	const lnk = e.target.closest('a');
	if (!lnk) return;
	e.preventDefault();
	const preset = lnk.getAttribute('href').substr(1);
	if (presetMap[preset]) {
		form.set(presetMap[preset]);
		updateInputValue(presetMap[preset]);
	}
}


function init () {
	const formEl = $('#settingsForm');
	form = new Form(formEl);
	formEl.addEventListener('submit', onSubmit);

	document.querySelectorAll('input').forEach(input => {
		input.addEventListener('input', e => {
			const inp = {};
			inp[e.target.name] = e.target.value;
			updateInputValue(inp);
		});
	});


	$('.btn-reset').addEventListener('click', reset);
	$('.btn-clear').addEventListener('click', () => clearCache().then(() => reset(true)));
	$('.preset-list').addEventListener('click', presetClick);

	updateInputValue(defaults);
	initSettings();
}


init();
