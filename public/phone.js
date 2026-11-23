// host mobile controller in strict es5
// manages rooms, hints, themes, pin
(function () {
var state = null;
var countries = [];
var packQuestions = [];
var activeView = 'live';
var pickerOpen = false;
var geoHintOpen = false;
var lastAskingNum = -1;
var newRoomTheme = 'standard';
var uiLang = 'uk';
var confirmTimers = {};
var errTimer = null;
var pollBusy = false;
var lastStateVersion = -1;
var lastPackFile = '';
var pinLocked = false;
var savedPin = '';

try {
if (window.sessionStorage) {
savedPin =
window.sessionStorage.getItem('hostPin') || '';
}
} catch (e) {}

// fetch dom node by id shorthand
// keeps wiring readable on narrow line
function $(id) {
return document.getElementById(id);
}

// check if mode uses competing teams
// true for duel and teams modes
function isTeamMode(mode) {
return mode === 'teams' || mode === 'duel';
}

// escape untrusted text before html
// stops xss and broken markup in ui
function esc(val) {
return String(val == null ? '' : val)
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&#39;');
}

// persist host pin in session storage
// avoids re-typing on page refresh
function saveSessionPin(pin) {
savedPin = String(pin || '');
try {
if (window.sessionStorage) {
if (savedPin) {
window.sessionStorage.setItem(
'hostPin',
savedPin
);
} else {
window.sessionStorage.removeItem('hostPin');
}
}
} catch (e) {}
}

// show temporary error banner at top
// auto-hides after 4.5 seconds
function showError(msg) {
var b = $('error-banner');
b.textContent = msg || 'Error';
b.style.display = 'block';
if (errTimer) clearTimeout(errTimer);
errTimer = setTimeout(function () {
b.style.display = 'none';
}, 4500);
}

// switch ui into pin unlock lock screen
// clears invalid cached pin on 401
function enterPinLock(errMsg) {
pinLocked = true;
saveSessionPin('');
var info = getT();
applyI18n(info.lang, info.t);
$('sticky-slot').style.display = 'none';
$('room-header').style.display = 'none';
$('screen-rooms').style.display = 'none';
$('screen-live').style.display = 'none';
$('screen-settings').style.display = 'none';
$('screen-pin').style.display = 'block';
var sndBtn = $('btn-tv-sound');
if (sndBtn) sndBtn.style.display = 'none';
if (errMsg) {
showError(errMsg);
}
}

// apply fresh host state and sync pack
// ignores stale out-of-order responses
function applyHostState(next, forceRender) {
if (!next) return;
var ver = next.stateVersion || 0;
if (!forceRender && ver < lastStateVersion) {
return;
}
var changed =
forceRender || ver !== lastStateVersion;
lastStateVersion = ver;
state = next;
var nextPack =
(next.room && next.room.packFile) || '';
if (nextPack && nextPack !== lastPackFile) {
lastPackFile = nextPack;
loadPackQuestions();
}
if (changed) {
render();
}
}

// send xhr json request to api route
// attaches host pin header when set
function apiPost(url, body, cb) {
var xhr = new XMLHttpRequest();
xhr.open('POST', url, true);
xhr.setRequestHeader(
'Content-Type',
'application/json;charset=UTF-8'
);
if (savedPin) {
xhr.setRequestHeader('X-Host-Pin', savedPin);
}
xhr.onreadystatechange = function () {
if (xhr.readyState !== 4) return;
try {
var res = JSON.parse(xhr.responseText);
if (xhr.status === 401 && res.pinRequired) {
enterPinLock(res.error);
return;
}
if (!res.ok) {
showError(res.error || 'Error');
return;
}
pinLocked = false;
if (res.state) {
applyHostState(res.state, true);
}
if (cb) cb(res);
} catch (e) {
showError('Network error');
}
};
xhr.send(JSON.stringify(body || {}));
}

// send xhr get request for json data
// passes host pin and catches 401 lock
function apiGet(url, cb, onDone) {
var xhr = new XMLHttpRequest();
xhr.open('GET', url, true);
if (savedPin) {
xhr.setRequestHeader('X-Host-Pin', savedPin);
}
xhr.onreadystatechange = function () {
if (xhr.readyState !== 4) return;
if (onDone) onDone();
if (xhr.status === 401) {
try {
var errRes = JSON.parse(xhr.responseText);
if (errRes && errRes.pinRequired) {
enterPinLock();
return;
}
} catch (e) {}
}
if (xhr.status === 200) {
try {
cb(JSON.parse(xhr.responseText));
} catch (e) {}
}
};
xhr.send();
}

// require two taps for destructive btns
// avoids window.confirm in iframe
function withConfirm(btn, label, fn) {
var key = btn.id || label;
var curLang =
(state && state.room && state.room.lang) ||
uiLang;
var t =
window.APP_I18N[curLang] ||
window.APP_I18N.uk;
if (confirmTimers[key]) {
clearTimeout(confirmTimers[key]);
delete confirmTimers[key];
btn.className = btn.className.replace(
' btn-confirming',
''
);
fn();
return;
}
btn.textContent = t.confirmAgain;
btn.className += ' btn-confirming';
confirmTimers[key] = setTimeout(function () {
delete confirmTimers[key];
btn.className = btn.className.replace(
' btn-confirming',
''
);
render();
}, 3000);
}

// load full countries list once
// builds fast hint picker chips
function loadCountries() {
apiGet('/api/countries', function (res) {
if (res && res.countries) {
countries = res.countries;
renderCountryChips();
}
});
}

// load questions for picker list
// updates when active pack changes
function loadPackQuestions() {
if (pinLocked) return;
apiGet('/api/pack-questions', function (res) {
if (res && res.questions) {
packQuestions = res.questions;
renderQuestionPicker();
}
});
}

// return active localization dictionary
// reads room lang or local uiLang
function getT() {
var lang =
(state && state.room && state.room.lang) ||
uiLang;
if (lang !== 'en') lang = 'uk';
return {
lang: lang,
t: window.APP_I18N[lang]
};
}

// apply localized labels across ui
// updates buttons, hints, placeholders
function applyI18n(lang, t) {
$('lbl-tv-addr').textContent = t.tvAddr;
$('btn-switch-tv').textContent = t.btnTv;
$('btn-lang-uk').className =
lang === 'uk'
? 'lang-pill active'
: 'lang-pill';
$('btn-lang-en').className =
lang === 'en'
? 'lang-pill active'
: 'lang-pill';

$('lbl-pin-lock-title').textContent =
t.pinLockTitle;
$('lbl-pin-lock-desc').textContent =
t.pinLockDesc;
$('input-unlock-pin').placeholder = t.pinPh;
$('btn-unlock-pin').textContent =
t.btnUnlockPin;

$('lbl-rooms-title').textContent =
t.roomsTitle;
$('lbl-rooms-desc').textContent =
t.roomsDesc;
$('new-room-name').placeholder =
t.newRoomPh;
$('btn-create-room').textContent =
t.btnCreateRoom;
$('new-theme-std').textContent =
t.themeStandard;
$('new-theme-dark').textContent =
t.themeDark;
$('new-theme-xmas').textContent =
t.themeChristmas;
$('new-theme-pub').textContent =
t.themePub;
$('new-theme-vysh').textContent =
t.themeVyshyvanka;
$('lbl-saved-rooms').textContent =
t.savedRooms;
$('lbl-backup-title').textContent =
t.backupTitle;
$('lbl-backup-desc').textContent =
t.backupDesc;
$('btn-export-json').textContent =
t.btnExport;
$('btn-import-json').textContent =
t.btnImport;

$('sticky-hint').textContent =
t.activeTeamHint;
$('lbl-phase').textContent = t.phaseLbl;
$('lbl-map').textContent = t.mapLbl;
$('lbl-theme-bar').textContent =
t.themeBarTitle;
$('live-theme-std').textContent =
t.themeStandard;
$('live-theme-dark').textContent =
t.themeDark;
$('live-theme-xmas').textContent =
t.themeChristmas;
$('live-theme-pub').textContent =
t.themePub;
$('live-theme-vysh').textContent =
t.themeVyshyvanka;
$('lbl-sb-pos').textContent = t.sbPosTitle;
$('sb-bottom').textContent = t.sbBottom;
$('sb-hidden').textContent = t.sbHidden;

$('input-add-team').placeholder =
t.addTeamPh;
$('btn-add-team').textContent = t.btnAddTeam;
$('lbl-wait-title').textContent =
t.waitingCardTitle;
$('lbl-wait-desc').textContent =
t.waitingCardDesc;
$('btn-start-tv').textContent = t.btnStartTv;
$('lbl-draw-title').textContent =
t.drawCardTitle;
$('lbl-draw-desc').textContent =
t.drawCardDesc;
$('btn-draw-next').textContent =
t.btnDrawNext;
$('btn-toggle-picker').textContent =
t.btnPickCountry;

$('lbl-host-eyes').textContent =
t.hostEyesOnly;
$('btn-correct').textContent = t.btnCorrect;
$('btn-wrong-stay').textContent =
t.btnWrongStay;
$('btn-wrong-pass').textContent =
t.btnWrongPass;
$('lbl-hint-title').textContent =
t.hintBoxTitle;
$('hint-country-search').placeholder =
t.hintSearchPh;
$('lbl-manual-hint').textContent =
t.hintManualLbl;
$('btn-hint-neighbor').textContent =
t.btnManualNeighbor;
$('btn-hint-close').textContent =
t.btnManualClose;
$('btn-hint-far').textContent =
t.btnManualFar;
$('btn-toggle-geo-hint').textContent =
t.btnGeoHint;
$('btn-reveal-part2').textContent =
t.btnRevealPart2;
$('btn-skip-reveal').textContent =
t.btnSkipReveal;
$('btn-skip-next').textContent =
t.btnSkipNext;
$('revealed-title').textContent =
t.tvCorrectTitle;
$('btn-next-ready').textContent =
t.btnNextQuestionPhase;
$('exhausted-title').textContent =
t.exhaustedTitle;
$('exhausted-desc').textContent =
t.exhaustedDesc;
$('btn-exhausted-pack').textContent =
t.btnPickOtherPack;
$('btn-exhausted-reset').textContent =
t.btnResetContinue;
$('finished-title').textContent =
t.phaseFinished;
$('btn-new-round-fin').textContent =
t.btnNewRound;
$('btn-undo').textContent = t.btnUndo;
if (!confirmTimers['btn-new-round-live']) {
$('btn-new-round-live').textContent =
t.btnNewRound;
}
$('btn-switch-room-live').textContent =
t.btnSwitchRoom;

$('lbl-set-mode').textContent =
t.setModeTitle;
$('lbl-set-mode-desc').textContent =
t.setModeDesc;
$('mode-duel-btn').textContent = t.modeDuel;
$('mode-teams-btn').textContent = t.modeTeams;
$('mode-coop-btn').textContent = t.modeCoop;
$('lbl-set-pack').textContent =
t.setPackTitle;
$('lbl-set-pack-desc').textContent =
t.setPackDesc;
$('btn-upload-pack').textContent =
t.btnUploadPack;
$('btn-download-pack').textContent =
t.btnDownloadPack;
$('btn-reset-asked').textContent =
t.btnResetAsked;
$('lbl-set-order').textContent =
t.setOrderTitle;
$('btn-order-random').textContent =
t.orderRandom;
$('btn-order-seq').textContent = t.orderSeq;
$('btn-tv-q-on').textContent = t.tvShowQ;
$('btn-tv-q-off').textContent = t.tvHideQ;
$('btn-bonus-on').textContent = t.bonusOn;
$('btn-bonus-off').textContent = t.bonusOff;
$('btn-autoturn-on').textContent = t.autoTurnOn;
$('btn-autoturn-off').textContent =
t.autoTurnOff;
$('lbl-set-teams').textContent =
t.setTeamsTitle;
$('lbl-set-room').textContent = t.setRoomTitle;
$('input-rename-room').placeholder =
t.renamePh;
$('btn-rename-room').textContent = t.btnRename;
if (!confirmTimers['btn-delete-room']) {
$('btn-delete-room').textContent =
t.btnDeleteRoom;
}
$('lbl-set-pin').textContent = t.setPinTitle;
$('lbl-set-pin-desc').textContent =
t.setPinDesc;
$('input-set-pin').placeholder = t.pinPh;
$('btn-save-pin').textContent = t.btnSavePin;
$('btn-disable-pin').textContent =
t.btnDisablePin;
}

// render country chips for distance hint
// filters by search input value
function renderCountryChips() {
var box = $('hint-country-chips');
if (!box) return;
var q = $('hint-country-search')
.value.trim()
.toLowerCase();
var info = getT();
var cq =
state &&
state.room &&
state.room.round &&
state.room.round.currentQuestion;
var tried = (cq && cq.guessedCodes) || [];
box.innerHTML = '';
for (var i = 0; i < countries.length; i++) {
var c = countries[i];
var name =
info.lang === 'en' ? c.en : c.uk;
if (
q &&
name.toLowerCase().indexOf(q) === -1 &&
c.code.toLowerCase().indexOf(q) === -1
) {
continue;
}
if (cq && cq.country === c.code) {
continue;
}
var btn = document.createElement('button');
btn.type = 'button';
btn.className =
tried.indexOf(c.code) !== -1
? 'country-chip tried'
: 'country-chip';
btn.textContent = c.code + ' ' + name;
btn.setAttribute('data-code', c.code);
btn.onclick = function () {
var gc = this.getAttribute('data-code');
apiPost('/api/distance-hint', {
guessedCode: gc
});
};
box.appendChild(btn);
}
}

// render selectable question list
// escapes question text cleanly
function renderQuestionPicker() {
var box = $('question-picker-list');
if (!box) return;
var asked =
(state &&
state.room &&
state.room.askedNumbers) ||
[];
var painted =
(state &&
state.room &&
state.room.round &&
state.room.round.painted) ||
{};
box.innerHTML = '';
for (var i = 0; i < packQuestions.length; i++) {
var q = packQuestions[i];
var isAsked = asked.indexOf(q.number) !== -1;
var isPainted = !!painted[q.country];
var btn = document.createElement('button');
btn.type = 'button';
btn.className =
isAsked || isPainted
? 'pick-row asked'
: 'pick-row';
btn.disabled = isPainted;
btn.setAttribute('data-num', q.number);
btn.innerHTML =
'<b>#' +
esc(q.number) +
' [' +
esc(q.country) +
(isPainted ? ' ✓' : '') +
']</b> ' +
(q.hasPart2 ? '★½ ' : '') +
esc(q.part1.slice(0, 56)) +
'…';
btn.onclick = function () {
var num = this.getAttribute('data-num');
pickerOpen = false;
$('question-picker-box').style.display =
'none';
apiPost('/api/draw-question', {
number: parseInt(num, 10)
});
};
box.appendChild(btn);
}
}

// render rooms selector list
// builds open and delete cards safely
function renderRooms(t) {
var box = $('rooms-list');
var list =
(state && state.roomsSummary) || [];
var maxC =
(state && state.totalCountries) || 25;
box.innerHTML = '';
if (list.length === 0) {
box.innerHTML =
'<div class="muted">' +
esc(t.noRooms) +
'</div>';
return;
}
for (var i = 0; i < list.length; i++) {
var r = list[i];
var card = document.createElement('div');
card.className = 'room-card';
card.innerHTML =
'<div class="room-card-title">' +
esc(r.name) +
'</div>' +
'<div class="room-card-meta">#' +
esc(r.gameNumber) +
' • ' +
esc(r.theme) +
' • ' +
esc(r.paintedCount) +
'/' +
esc(maxC) +
'</div>';
var row = document.createElement('div');
row.className = 'row-list';
row.style.marginBottom = '0';

var openBtn = document.createElement('button');
openBtn.type = 'button';
openBtn.className = 'pill-btn selected';
openBtn.textContent = t.btnOpenRoom;
openBtn.setAttribute('data-id', r.id);
openBtn.onclick = function () {
apiPost('/api/select-room', {
roomId: this.getAttribute('data-id')
});
};

var delBtn = document.createElement('button');
delBtn.type = 'button';
delBtn.className = 'pill-btn';
delBtn.textContent = t.btnDelete;
delBtn.setAttribute('data-id', r.id);
delBtn.onclick = function () {
var rid = this.getAttribute('data-id');
withConfirm(this, 'del_' + rid, function () {
apiPost('/api/delete-room', {
roomId: rid
});
});
};
row.appendChild(openBtn);
row.appendChild(delBtn);
card.appendChild(row);
box.appendChild(card);
}
}

// render sticky top active team bar
// updates dropdown list of all teams
function renderStickyTeam(room, t) {
var slot = $('sticky-slot');
if (
!room ||
!isTeamMode(room.gameMode) ||
activeView === 'settings'
) {
slot.style.display = 'none';
return;
}
slot.style.display = 'block';
var active = null;
for (var i = 0; i < room.teams.length; i++) {
if (
room.teams[i].id === room.round.activeTeamId
) {
active = room.teams[i];
break;
}
}
if (!active && room.teams.length > 0) {
active = room.teams[0];
}
if (active) {
$('sticky-dot').style.background =
active.color;
$('sticky-label').textContent =
active.name +
' (' +
active.score +
' pts • ' +
active.countries +
' 🗺)';
} else {
$('sticky-label').textContent = t.selectTeam;
}
var dd = $('sticky-dropdown');
dd.innerHTML = '';
for (var k = 0; k < room.teams.length; k++) {
var tm = room.teams[k];
var item = document.createElement('button');
item.type = 'button';
item.className =
active && tm.id === active.id
? 'dropdown-item selected'
: 'dropdown-item';
item.setAttribute('data-tid', tm.id);
item.innerHTML =
'<span><span class="color-dot" style="display:inline-block;margin-right:6px;background:' +
esc(tm.color) +
';"></span>' +
esc(tm.name) +
'</span><span>' +
esc(tm.score) +
' pts</span>';
item.onclick = function () {
dd.style.display = 'none';
apiPost('/api/set-active-team', {
teamId: this.getAttribute('data-tid')
});
};
dd.appendChild(item);
}
}

// render full phone ui from state
// switches rooms, live, and settings
function render() {
if (pinLocked || !state) return;
$('screen-pin').style.display = 'none';
var info = getT();
var lang = info.lang;
var t = info.t;
applyI18n(lang, t);

var sndBtn = $('btn-tv-sound');
var room = state.room;
if (!room) {
if (sndBtn) sndBtn.style.display = 'none';
$('sticky-slot').style.display = 'none';
$('room-header').style.display = 'none';
$('screen-live').style.display = 'none';
$('screen-settings').style.display = 'none';
$('screen-rooms').style.display = 'block';
renderRooms(t);
return;
}

if (sndBtn) {
sndBtn.style.display = '';
sndBtn.textContent = room.tvSound
? '🔊'
: '🔇';
sndBtn.title = room.tvSound
? t.tvSoundBtnOn
: t.tvSoundBtnOff;
sndBtn.className = room.tvSound
? 'lang-pill sound-on'
: 'lang-pill sound-off';
}

$('screen-rooms').style.display = 'none';
$('room-header').style.display = 'block';
$('header-room-name').textContent = room.name;

var paintedCount = Object.keys(
(room.round && room.round.painted) || {}
).length;
var maxC = state.totalCountries || 25;
var leftQ =
(room.round &&
room.round.queue &&
room.round.queue.length) ||
0;
$('header-badge').textContent =
'#' +
room.gameNumber +
' • 🗺 ' +
paintedCount +
'/' +
maxC +
' • Q ' +
leftQ +
'/' +
(state.packTotal || 0);

$('btn-toggle-settings').textContent =
activeView === 'settings'
? t.btnBackLive
: t.btnSettings;
$('btn-toggle-settings').className =
activeView === 'settings'
? 'btn-settings-toggle active'
: 'btn-settings-toggle';

renderStickyTeam(room, t);

if (activeView === 'settings') {
$('screen-live').style.display = 'none';
$('screen-settings').style.display = 'block';
renderSettings(room, lang, t);
return;
}

$('screen-settings').style.display = 'none';
$('screen-live').style.display = 'block';
renderLive(room, lang, t);
}

// render live control screen cards
// updates phase buttons and hint box
function renderLive(room, lang, t) {
var round = room.round || {};
var phase = round.phase || 'waiting';
var maxC =
(state && state.totalCountries) || 25;
var phaseMap = {
waiting: t.phaseWaiting,
ready: t.phaseReady,
asking: t.phaseAsking,
revealed: t.phaseRevealed,
exhausted: t.phaseExhausted,
finished: t.phaseFinished
};
$('val-phase').textContent =
phaseMap[phase] || phase;
var paintedCount = Object.keys(
round.painted || {}
).length;
$('val-map').textContent =
paintedCount +
'/' +
maxC +
' • Q ' +
((round.queue && round.queue.length) || 0);

var sb = room.scoreboardPos || 'bottom';
$('sb-bottom').className =
sb !== 'hidden'
? 'pill-btn selected'
: 'pill-btn';
$('sb-hidden').className =
sb === 'hidden'
? 'pill-btn selected'
: 'pill-btn';

$('card-add-team').style.display =
room.gameMode === 'teams' ? 'block' : 'none';
$('card-waiting').style.display =
phase === 'waiting' ? 'block' : 'none';
$('card-ready').style.display =
phase === 'ready' ? 'block' : 'none';
$('card-asking').style.display =
phase === 'asking' ? 'block' : 'none';
$('card-revealed').style.display =
phase === 'revealed' ? 'block' : 'none';
$('card-exhausted').style.display =
phase === 'exhausted' ? 'block' : 'none';
$('card-finished').style.display =
phase === 'finished' ? 'block' : 'none';

var finTxt =
room.gameMode === 'coop'
? t.coopFinishBtn
: t.btnFinishRound;
if (!confirmTimers['btn-finish-round']) {
$('btn-finish-round').textContent = finTxt;
}
if (!confirmTimers['btn-exhausted-finish']) {
$('btn-exhausted-finish').textContent = finTxt;
}

$('btn-undo').disabled = !round.undoSnapshot;

if (phase === 'asking' && round.currentQuestion) {
var cq = round.currentQuestion;
var valBadge = $('val-q-points');
valBadge.textContent = cq.isHalfValue
? cq.currentValue + ' pts (½)'
: cq.currentValue + ' pts';
valBadge.className = cq.isHalfValue
? 'value-badge half'
: 'value-badge';

$('asking-q-num').textContent =
'#' + cq.number + ' [' + cq.country + ']';
$('asking-q-part1').textContent = cq.part1;

var p2Box = $('asking-q-part2-box');
if (cq.hasPart2) {
p2Box.style.display = 'block';
p2Box.innerHTML =
'<b>' +
esc(t.part2HostLbl) +
'</b><br>' +
esc(cq.part2) +
(cq.part2Revealed
? ' <b>[OPEN ON TV]</b>'
: '');
} else {
p2Box.style.display = 'none';
}

var cName = cq.country;
for (var c = 0; c < countries.length; c++) {
if (countries[c].code === cq.country) {
cName =
lang === 'en'
? countries[c].en
: countries[c].uk;
break;
}
}
$('asking-answer-box').innerHTML =
esc(t.answerCountryLbl) +
' ' +
esc(cName) +
'<br><span style="font-weight:500;color:#cbd5e1;">' +
esc(cq.answerText) +
'</span>';

var isCoop = room.gameMode === 'coop';
$('btn-wrong-pass').style.display = isCoop
? 'none'
: '';
$('btn-wrong-stay').textContent = isCoop
? t.btnWrongCoop
: t.btnWrongStay;

if (cq.number !== lastAskingNum) {
lastAskingNum = cq.number;
geoHintOpen = false;
$('hint-country-search').value = '';
}

var geoBtn = $('btn-toggle-geo-hint');
geoBtn.textContent =
cq.hintCount > 0
? t.btnGeoHint + ' ×' + cq.hintCount
: t.btnGeoHint;
geoBtn.className = geoHintOpen
? 'pill-btn selected'
: 'pill-btn';

$('hint-controls-box').style.display =
geoHintOpen ? 'block' : 'none';
if (geoHintOpen) {
renderCountryChips();
}

var lhp = $('last-hint-pill');
if (cq.lastHint) {
lhp.style.display = 'block';
var tierLbl =
cq.lastHint.tier === 'neighbor'
? t.hintNeighbor
: cq.lastHint.tier === 'close'
? t.hintClose
: t.hintFar;
lhp.textContent =
(cq.lastHint.guessedCode
? cq.lastHint.guessedCode + ' → '
: '') + tierLbl;
} else {
lhp.style.display = 'none';
}

var p2Btn = $('btn-reveal-part2');
if (cq.hasPart2) {
p2Btn.style.display = '';
p2Btn.disabled = Boolean(cq.part2Revealed);
p2Btn.textContent = cq.part2Revealed
? t.btnPart2Opened
: t.btnRevealPart2;
p2Btn.className = cq.part2Revealed
? 'pill-btn selected'
: 'pill-btn';
} else {
p2Btn.style.display = 'none';
}
}

if (
phase === 'revealed' &&
round.currentQuestion
) {
$('revealed-answer').textContent =
round.currentQuestion.answerText;
}
}

// render settings screen packs, teams, pin
// lets host switch packs or edit points
function renderSettings(room, lang, t) {
$('mode-duel-btn').className =
room.gameMode === 'duel'
? 'pill-btn selected'
: 'pill-btn';
$('mode-teams-btn').className =
room.gameMode === 'teams'
? 'pill-btn selected'
: 'pill-btn';
$('mode-coop-btn').className =
room.gameMode === 'coop'
? 'pill-btn selected'
: 'pill-btn';

var packBox = $('pack-list');
packBox.innerHTML = '';
var packs = state.packs || [];
for (var i = 0; i < packs.length; i++) {
var pk = packs[i];
var btn = document.createElement('button');
btn.type = 'button';
btn.className =
pk.file === room.packFile
? 'pill-btn selected'
: 'pill-btn';
btn.setAttribute('data-file', pk.file);
btn.textContent =
(lang === 'en' ? pk.labelEn : pk.labelUk) +
' (' +
pk.count +
')';
btn.onclick = function () {
var fn = this.getAttribute('data-file');
apiPost(
'/api/settings',
{ packFile: fn },
function () {
loadPackQuestions();
}
);
};
packBox.appendChild(btn);
}

$('btn-order-random').className =
room.isRandomOrder
? 'pill-btn selected'
: 'pill-btn';
$('btn-order-seq').className =
!room.isRandomOrder
? 'pill-btn selected'
: 'pill-btn';
$('btn-tv-q-on').className =
room.showQuestionOnTv
? 'pill-btn selected'
: 'pill-btn';
$('btn-tv-q-off').className =
!room.showQuestionOnTv
? 'pill-btn selected'
: 'pill-btn';
$('btn-bonus-on').className =
room.neighborBonus
? 'pill-btn selected'
: 'pill-btn';
$('btn-bonus-off').className =
!room.neighborBonus
? 'pill-btn selected'
: 'pill-btn';
var autoTurn = room.autoPassTurn !== false;
$('btn-autoturn-on').className = autoTurn
? 'pill-btn selected'
: 'pill-btn';
$('btn-autoturn-off').className = !autoTurn
? 'pill-btn selected'
: 'pill-btn';

$('live-theme-std').className =
room.theme === 'standard'
? 'pill-btn selected'
: 'pill-btn';
$('live-theme-dark').className =
room.theme === 'dark'
? 'pill-btn selected'
: 'pill-btn';
$('live-theme-xmas').className =
room.theme === 'christmas'
? 'pill-btn selected'
: 'pill-btn';
$('live-theme-pub').className =
room.theme === 'pub'
? 'pill-btn selected'
: 'pill-btn';
$('live-theme-vysh').className =
room.theme === 'vyshyvanka'
? 'pill-btn selected'
: 'pill-btn';

var pinOn = Boolean(state && state.pinEnabled);
$('val-pin-status').textContent = pinOn
? t.pinStatusOn
: t.pinStatusOff;
$('btn-disable-pin').style.display = pinOn
? 'block'
: 'none';

var tList = $('settings-teams-list');
tList.innerHTML = '';
if (room.gameMode === 'coop') {
var cRow = document.createElement('div');
cRow.className = 'team-edit-row';
cRow.innerHTML =
'<span>' +
esc(t.coopScoreLbl) +
': <b>' +
esc(room.coopScore) +
'</b></span>';
var cBtns = document.createElement('div');
cBtns.className = 'team-edit-btns';
var m10 = document.createElement('button');
m10.type = 'button';
m10.className = 'mini-btn';
m10.textContent = '-10';
m10.onclick = function () {
apiPost('/api/adjust-score', { delta: -10 });
};
var p10 = document.createElement('button');
p10.type = 'button';
p10.className = 'mini-btn';
p10.textContent = '+10';
p10.onclick = function () {
apiPost('/api/adjust-score', { delta: 10 });
};
cBtns.appendChild(m10);
cBtns.appendChild(p10);
cRow.appendChild(cBtns);
tList.appendChild(cRow);
} else {
for (var k = 0; k < room.teams.length; k++) {
var tm = room.teams[k];
var row = document.createElement('div');
row.className = 'team-edit-row';
row.innerHTML =
'<div class="team-edit-left"><span class="color-dot" style="background:' +
esc(tm.color) +
'"></span><span>' +
esc(tm.name) +
' (' +
esc(tm.score) +
')</span></div>';
var btns = document.createElement('div');
btns.className = 'team-edit-btns';

var bm = document.createElement('button');
bm.type = 'button';
bm.className = 'mini-btn';
bm.textContent = '-10';
bm.setAttribute('data-tid', tm.id);
bm.onclick = function () {
apiPost('/api/adjust-score', {
teamId: this.getAttribute('data-tid'),
delta: -10
});
};

var bp = document.createElement('button');
bp.type = 'button';
bp.className = 'mini-btn';
bp.textContent = '+10';
bp.setAttribute('data-tid', tm.id);
bp.onclick = function () {
apiPost('/api/adjust-score', {
teamId: this.getAttribute('data-tid'),
delta: 10
});
};

btns.appendChild(bm);
btns.appendChild(bp);
if (room.gameMode !== 'duel') {
var bd = document.createElement('button');
bd.type = 'button';
bd.className = 'mini-btn';
bd.textContent = '✕';
bd.setAttribute('data-tid', tm.id);
bd.onclick = function () {
apiPost('/api/remove-team', {
teamId: this.getAttribute('data-tid')
});
};
btns.appendChild(bd);
}
row.appendChild(btns);
tList.appendChild(row);
}
}
}

// build download url with optional pin
// keeps pack and json exports working
function withPinParam(base) {
if (!savedPin) return base;
var sep = base.indexOf('?') === -1 ? '?' : '&';
return (
base +
sep +
'pin=' +
encodeURIComponent(savedPin)
);
}

// wire all static dom clicks and inputs
// runs once at page startup
function bindEvents() {
$('btn-unlock-pin').onclick = function () {
var entered = $('input-unlock-pin').value.trim();
if (!entered) return;
apiPost(
'/api/verify-pin',
{ pin: entered },
function () {
$('input-unlock-pin').value = '';
saveSessionPin(entered);
pinLocked = false;
lastStateVersion = -1;
poll(true);
loadPackQuestions();
}
);
};

$('btn-save-pin').onclick = function () {
var nextPin = $('input-set-pin').value.trim();
if (!nextPin) return;
apiPost(
'/api/host-pin',
{ pin: nextPin },
function () {
$('input-set-pin').value = '';
saveSessionPin(nextPin);
}
);
};

$('btn-disable-pin').onclick = function () {
apiPost(
'/api/host-pin',
{ pin: '' },
function () {
saveSessionPin('');
}
);
};

$('btn-switch-tv').onclick = function () {
if (
window.parent &&
window.parent !== window
) {
window.parent.postMessage(
{ type: 'CLOSE_HOST_DRAWER' },
'*'
);
} else {
window.location.href = '/';
}
};

$('btn-lang-uk').onclick = function () {
uiLang = 'uk';
if (!pinLocked && state && state.room) {
apiPost('/api/settings', { lang: 'uk' });
} else {
var info = getT();
applyI18n(info.lang, info.t);
render();
}
};

$('btn-lang-en').onclick = function () {
uiLang = 'en';
if (!pinLocked && state && state.room) {
apiPost('/api/settings', { lang: 'en' });
} else {
var info = getT();
applyI18n(info.lang, info.t);
render();
}
};

$('new-theme-std').onclick = function () {
newRoomTheme = 'standard';
$('new-theme-std').className =
'pill-btn selected';
$('new-theme-dark').className = 'pill-btn';
$('new-theme-xmas').className = 'pill-btn';
$('new-theme-pub').className = 'pill-btn';
$('new-theme-vysh').className = 'pill-btn';
};
$('new-theme-dark').onclick = function () {
newRoomTheme = 'dark';
$('new-theme-std').className = 'pill-btn';
$('new-theme-dark').className =
'pill-btn selected';
$('new-theme-xmas').className = 'pill-btn';
$('new-theme-pub').className = 'pill-btn';
$('new-theme-vysh').className = 'pill-btn';
};
$('new-theme-xmas').onclick = function () {
newRoomTheme = 'christmas';
$('new-theme-std').className = 'pill-btn';
$('new-theme-dark').className = 'pill-btn';
$('new-theme-xmas').className =
'pill-btn selected';
$('new-theme-pub').className = 'pill-btn';
$('new-theme-vysh').className = 'pill-btn';
};
$('new-theme-pub').onclick = function () {
newRoomTheme = 'pub';
$('new-theme-std').className = 'pill-btn';
$('new-theme-dark').className = 'pill-btn';
$('new-theme-xmas').className = 'pill-btn';
$('new-theme-pub').className =
'pill-btn selected';
$('new-theme-vysh').className = 'pill-btn';
};
$('new-theme-vysh').onclick = function () {
newRoomTheme = 'vyshyvanka';
$('new-theme-std').className = 'pill-btn';
$('new-theme-dark').className = 'pill-btn';
$('new-theme-xmas').className = 'pill-btn';
$('new-theme-pub').className = 'pill-btn';
$('new-theme-vysh').className =
'pill-btn selected';
};

$('btn-create-room').onclick = function () {
var nm = $('new-room-name').value.trim();
$('new-room-name').value = '';
apiPost('/api/create-room', {
name: nm,
lang: uiLang,
theme: newRoomTheme
});
};

$('sticky-btn').onclick = function () {
var dd = $('sticky-dropdown');
dd.style.display =
dd.style.display === 'none'
? 'block'
: 'none';
};

$('btn-toggle-settings').onclick = function () {
activeView =
activeView === 'settings'
? 'live'
: 'settings';
render();
};

$('btn-tv-sound').onclick = function () {
var cur =
state && state.room && state.room.tvSound;
apiPost('/api/settings', { tvSound: !cur });
};

$('live-theme-std').onclick = function () {
apiPost('/api/settings', { theme: 'standard' });
};
$('live-theme-dark').onclick = function () {
apiPost('/api/settings', { theme: 'dark' });
};
$('live-theme-xmas').onclick = function () {
apiPost('/api/settings', {
theme: 'christmas'
});
};
$('live-theme-pub').onclick = function () {
apiPost('/api/settings', { theme: 'pub' });
};
$('live-theme-vysh').onclick = function () {
apiPost('/api/settings', {
theme: 'vyshyvanka'
});
};

$('sb-bottom').onclick = function () {
apiPost('/api/settings', {
scoreboardPos: 'bottom'
});
};
$('sb-hidden').onclick = function () {
apiPost('/api/settings', {
scoreboardPos: 'hidden'
});
};

$('btn-add-team').onclick = function () {
var nm = $('input-add-team').value.trim();
if (!nm) return;
$('input-add-team').value = '';
apiPost('/api/add-team', { name: nm });
};

$('btn-start-tv').onclick = function () {
apiPost('/api/start-tv', {});
};

$('btn-draw-next').onclick = function () {
apiPost('/api/draw-question', {});
};

$('btn-toggle-picker').onclick = function () {
pickerOpen = !pickerOpen;
$('question-picker-box').style.display =
pickerOpen ? 'block' : 'none';
if (pickerOpen) {
loadPackQuestions();
}
};

$('btn-finish-round').onclick = function () {
withConfirm(
this,
'btn-finish-round',
function () {
apiPost('/api/finish-round', {});
}
);
};

$('btn-exhausted-pack').onclick = function () {
activeView = 'settings';
render();
};

$('btn-exhausted-reset').onclick = function () {
apiPost('/api/reset-asked', {});
};

$('btn-exhausted-finish').onclick = function () {
withConfirm(
this,
'btn-exhausted-finish',
function () {
apiPost('/api/finish-round', {});
}
);
};

$('btn-correct').onclick = function () {
apiPost('/api/correct-answer', {});
};

$('btn-wrong-stay').onclick = function () {
apiPost('/api/wrong-answer', {
advanceTurn: false
});
};

$('btn-wrong-pass').onclick = function () {
apiPost('/api/wrong-answer', {
advanceTurn: true
});
};

$('hint-country-search').oninput = function () {
renderCountryChips();
};

$('btn-hint-neighbor').onclick = function () {
apiPost('/api/distance-hint', {
manualTier: 'neighbor'
});
};
$('btn-hint-close').onclick = function () {
apiPost('/api/distance-hint', {
manualTier: 'close'
});
};
$('btn-hint-far').onclick = function () {
apiPost('/api/distance-hint', {
manualTier: 'far'
});
};

$('btn-toggle-geo-hint').onclick = function () {
geoHintOpen = !geoHintOpen;
render();
};

$('btn-reveal-part2').onclick = function () {
apiPost('/api/reveal-part2', {});
};

$('btn-skip-reveal').onclick = function () {
apiPost('/api/skip-question', {
reveal: true
});
};

$('btn-skip-next').onclick = function () {
apiPost('/api/skip-question', {
reveal: false
});
};

$('btn-next-ready').onclick = function () {
apiPost('/api/next-ready', {});
};

$('btn-new-round-fin').onclick = function () {
apiPost('/api/new-round', {});
};

$('btn-undo').onclick = function () {
apiPost('/api/undo', {});
};

$('btn-new-round-live').onclick = function () {
withConfirm(this, 'new_round', function () {
apiPost('/api/new-round', {});
});
};

$('btn-switch-room-live').onclick = function () {
activeView = 'live';
apiPost('/api/leave-room', {});
};

$('mode-duel-btn').onclick = function () {
apiPost('/api/settings', {
gameMode: 'duel'
});
};

$('mode-teams-btn').onclick = function () {
apiPost('/api/settings', {
gameMode: 'teams'
});
};

$('mode-coop-btn').onclick = function () {
apiPost('/api/settings', {
gameMode: 'coop'
});
};

$('btn-order-random').onclick = function () {
apiPost('/api/settings', {
isRandomOrder: true
});
};

$('btn-order-seq').onclick = function () {
apiPost('/api/settings', {
isRandomOrder: false
});
};

$('btn-tv-q-on').onclick = function () {
apiPost('/api/settings', {
showQuestionOnTv: true
});
};

$('btn-tv-q-off').onclick = function () {
apiPost('/api/settings', {
showQuestionOnTv: false
});
};

$('btn-bonus-on').onclick = function () {
apiPost('/api/settings', {
neighborBonus: true
});
};

$('btn-bonus-off').onclick = function () {
apiPost('/api/settings', {
neighborBonus: false
});
};

$('btn-autoturn-on').onclick = function () {
apiPost('/api/settings', {
autoPassTurn: true
});
};

$('btn-autoturn-off').onclick = function () {
apiPost('/api/settings', {
autoPassTurn: false
});
};

$('btn-reset-asked').onclick = function () {
apiPost('/api/reset-asked', {});
};

$('btn-download-pack').onclick = function () {
var file =
(state &&
state.room &&
state.room.packFile) ||
'facts_uk.txt';
window.location.href = withPinParam(
'/api/download-pack?file=' +
encodeURIComponent(file)
);
};

$('btn-upload-pack').onclick = function () {
$('input-upload-pack').click();
};

$('input-upload-pack').onchange = function () {
var f =
this.files && this.files[0];
if (!f) return;
var reader = new FileReader();
reader.onload = function (ev) {
apiPost(
'/api/upload-pack',
{
fileName: f.name,
content: ev.target.result
},
function () {
loadPackQuestions();
}
);
};
reader.readAsText(f);
this.value = '';
};

$('btn-rename-room').onclick = function () {
var nm = $('input-rename-room').value.trim();
if (!nm) return;
$('input-rename-room').value = '';
apiPost('/api/rename-room', { name: nm });
};

$('btn-delete-room').onclick = function () {
if (!state || !state.room) return;
var rid = state.room.id;
withConfirm(
this,
'btn-delete-room',
function () {
activeView = 'live';
apiPost('/api/delete-room', {
roomId: rid
});
}
);
};

$('btn-export-json').onclick = function () {
window.location.href = withPinParam(
'/api/export-json'
);
};

$('btn-import-json').onclick = function () {
$('input-import-json').click();
};

$('input-import-json').onchange = function () {
var f =
this.files && this.files[0];
if (!f) return;
var reader = new FileReader();
reader.onload = function (ev) {
try {
var data = JSON.parse(ev.target.result);
apiPost('/api/import-json', { data: data });
} catch (e) {
showError('Invalid JSON');
}
};
reader.readAsText(f);
this.value = '';
};
}

// poll host state every 1200ms while open
// skips dom redraw when state unchanged
function poll(force) {
if (pollBusy || pinLocked) return;
pollBusy = true;
apiGet(
'/api/host-state',
function (res) {
applyHostState(res, Boolean(force));
},
function () {
pollBusy = false;
}
);
}

bindEvents();
loadCountries();
apiGet('/api/ip', function (info) {
if (info && info.ip) {
$('host-url-text').textContent =
'http://' + info.ip + ':' + info.port;
}
});
poll(true);
setInterval(function () {
poll(false);
}, 1200);
})();
