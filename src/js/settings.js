/* global browser, Form, Toast */

let form;
const defaults = {
	iconradius: 10,
	iconsize: '74',
	pagebg: '#eee',
	pagecolor: '#444',
	rootfolder: 'speeddial',
};


function notify () {
	new Toast('Settings saved', 'info');
}

function save (settings) {
	return browser.storage.local.set({ settings }).then(notify);
}


function onSubmit (e) {
	e.preventDefault();
	save(form.get());
}

function reset () {
	save(defaults).then(() => form.set(defaults));
}


function initSettings () {
	browser.storage.local.get('settings').then(store => {
		const merged = Object.assign({}, defaults, store.settings);
		form.set(merged);
	});
}


function init () {
	const formEl = document.querySelector('#settingsForm');
	form = new Form(formEl);
	formEl.addEventListener('submit', onSubmit);
	document.querySelector('.btn-reset').addEventListener('click', reset);
	initSettings();
}


init();
