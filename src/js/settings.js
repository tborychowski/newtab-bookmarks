/* global browser, Form, Toast */

let form, iconradiusTooltip, iconsizeTooltip;
const defaults = {
	iconradius: 10,
	iconsize: '74',
	pagebg: '#eee',
	pagecolor: '#444',
	rootfolder: 'speeddial',
};

const $ = s => document.querySelector(s);
const notify = () => new Toast('Settings saved', 'info');

const save = settings => browser.storage.local.set({ settings }).then(notify);


function setOther (things) {
	if (things.iconsize) iconsizeTooltip.innerText = things.iconsize;
	if (things.iconradius) iconradiusTooltip.innerText = things.iconradius;
	if (things.pagecolor) document.body.style.color = things.pagecolor;
	if (things.pagebg) document.body.style.background = things.pagebg;
}

function onSubmit (e) {
	e.preventDefault();
	save(form.get());
}

function reset () {
	save(defaults).then(() => {
		form.set(defaults);
		setOther(defaults);
	});
}


function initSettings () {
	browser.storage.local.get('settings').then(store => {
		const merged = Object.assign({}, defaults, store.settings || {});
		form.set(merged);
		setOther(merged);
	});
}


function init () {
	const formEl = $('#settingsForm');
	form = new Form(formEl);
	formEl.addEventListener('submit', onSubmit);

	iconradiusTooltip = $('.iconradius-tooltip');
	iconsizeTooltip = $('.iconsize-tooltip');

	$('input[name=iconsize]').addEventListener('input', e => setOther({ iconsize: e.target.value }));
	$('input[name=iconradius]').addEventListener('input', e => setOther({ iconradius: e.target.value }));
	$('input[name=pagecolor]').addEventListener('input', e => setOther({ pagecolor: e.target.value }));
	$('input[name=pagebg]').addEventListener('input', e => setOther({ pagebg: e.target.value }));

	$('.btn-reset').addEventListener('click', reset);

	initSettings();
}


init();
