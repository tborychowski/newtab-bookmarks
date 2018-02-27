/* global browser, Form, Toast */

let form, iconradiusTooltip, iconsizeTooltip, maxwidthTooltip;
const defaults = {
	maxwidth: 968,
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
	if (things.maxwidth) maxwidthTooltip.innerText = things.maxwidth;
	if (things.iconsize) iconsizeTooltip.innerText = things.iconsize;
	if (things.iconradius) iconradiusTooltip.innerText = things.iconradius;
	if (things.pagecolor) document.body.style.color = things.pagecolor;
	if (things.pagebg) document.body.style.background = things.pagebg;
}

function onSubmit (e) {
	e.preventDefault();
	save(form.get());
}

function reset (persist) {
	form.set(defaults);
	setOther(defaults);
	if (persist === true) save(defaults);
}


function clearCache () {
	browser.storage.local.clear().then(() => reset(true));
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

	maxwidthTooltip = $('.maxwidth-tooltip');
	iconradiusTooltip = $('.iconradius-tooltip');
	iconsizeTooltip = $('.iconsize-tooltip');

	$('input[name=maxwidth]').addEventListener('input', e => setOther({ maxwidth: e.target.value }));
	$('input[name=iconsize]').addEventListener('input', e => setOther({ iconsize: e.target.value }));
	$('input[name=iconradius]').addEventListener('input', e => setOther({ iconradius: e.target.value }));
	$('input[name=pagecolor]').addEventListener('input', e => setOther({ pagecolor: e.target.value }));
	$('input[name=pagebg]').addEventListener('input', e => setOther({ pagebg: e.target.value }));

	$('.btn-reset').addEventListener('click', reset);
	$('.btn-clear').addEventListener('click', clearCache);

	initSettings();
}


init();
