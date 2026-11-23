// tv screen client in strict es5
// polls server, plays audio, draws map
(function () {
var stageEl =
document.getElementById('tv-stage');
var canvas =
document.getElementById('game-canvas');
var ctx =
canvas && canvas.getContext
? canvas.getContext('2d')
: null;
var waitingEl =
document.getElementById('waiting-screen');
var titleEl =
document.getElementById('wait-title');
var subEl =
document.getElementById('wait-sub');
var hintEl =
document.getElementById('wait-hint');
var fsBtn =
document.getElementById('tv-fs-btn');
var soundBtn =
document.getElementById('tv-sound-btn');
var hostBtn =
document.getElementById('tv-host-btn');
var cornerHostBtn =
document.getElementById('corner-host-btn');
var secretZone =
document.getElementById('secret-debug-zone');
var hostFrame =
document.getElementById('debug-host-frame');

var latestState = null;
var lastStateVersion = -1;
var lastEventId = 0;
var hasPolledOnce = false;
var pollBusy = false;
var rafPending = false;
var needsDraw = true;
var hostOpen = false;
var debugUnlocked = false;
var secretClicks = 0;
var secretTimer = null;
var audioCtx = null;
var audioUnlocked = false;
var wakeLock = null;

// request screen wake lock on smart tv
// keeps display awake during long quiz
function keepAwake() {
try {
if (
!navigator.wakeLock ||
typeof navigator.wakeLock.request !==
'function'
) {
return;
}
if (wakeLock && !wakeLock.released) {
return;
}
navigator.wakeLock
.request('screen')
.then(function (lock) {
wakeLock = lock;
})
.catch(function () {});
} catch (e) {}
}

document.addEventListener(
'visibilitychange',
function () {
if (
document.visibilityState === 'visible'
) {
keepAwake();
}
}
);
document.addEventListener('click', keepAwake);
keepAwake();

// request fullscreen with vendor prefixes
// helps tv browser fill entire display
function askFullscreen() {
var el = document.documentElement;
var fn =
el.requestFullscreen ||
el.webkitRequestFullscreen ||
el.webkitRequestFullScreen ||
el.mozRequestFullScreen;
if (!fn) return;
try {
var res = fn.call(el);
if (res && typeof res.catch === 'function') {
res.catch(function () {});
}
} catch (e) {}
}

// unlock web audio context on user tap
// required by mobile and tv browsers
function unlockAudio() {
try {
var Ctx =
window.AudioContext ||
window.webkitAudioContext;
if (!Ctx) return;
if (!audioCtx) {
audioCtx = new Ctx();
}
if (
audioCtx.state === 'suspended' &&
audioCtx.resume
) {
audioCtx.resume();
}
if (!audioUnlocked) {
var buf = audioCtx.createBuffer(
1,
1,
22050
);
var src = audioCtx.createBufferSource();
src.buffer = buf;
src.connect(audioCtx.destination);
src.start(0);
audioUnlocked = true;
}
} catch (e) {}
}

// play single synthesized tone note
// uses oscillator with smooth decay
function playTone(
freq,
dur,
delay,
type,
vol
) {
if (!audioCtx) return;
try {
var t0 =
audioCtx.currentTime + (delay || 0);
var osc = audioCtx.createOscillator();
var gain = audioCtx.createGain();
osc.type = type || 'sine';
osc.frequency.setValueAtTime(freq, t0);
gain.gain.setValueAtTime(
vol || 0.14,
t0
);
gain.gain.exponentialRampToValueAtTime(
0.001,
t0 + dur
);
osc.connect(gain);
gain.connect(audioCtx.destination);
osc.start(t0);
osc.stop(t0 + dur + 0.02);
} catch (e) {}
}

// play theme-aware event sound fx
// adds sleigh bell chime on christmas
function playEventSound(type, theme) {
if (
!latestState ||
!latestState.room ||
!latestState.room.tvSound
) {
return;
}
unlockAudio();
if (!audioCtx) return;
if (type === 'country_painted') {
if (theme === 'christmas') {
playTone(784, 0.18, 0, 'triangle', 0.16);
playTone(988, 0.18, 0.12, 'triangle', 0.16);
playTone(1175, 0.25, 0.24, 'sine', 0.18);
playTone(1568, 0.45, 0.38, 'sine', 0.16);
} else if (theme === 'pub') {
playTone(440, 0.22, 0, 'triangle', 0.15);
playTone(554, 0.22, 0.11, 'triangle', 0.15);
playTone(659, 0.36, 0.22, 'sine', 0.17);
} else {
playTone(523, 0.16, 0, 'triangle', 0.16);
playTone(659, 0.16, 0.11, 'triangle', 0.16);
playTone(784, 0.35, 0.22, 'sine', 0.18);
}
} else if (type === 'wrong_answer') {
playTone(220, 0.22, 0, 'sawtooth', 0.09);
playTone(185, 0.28, 0.14, 'sawtooth', 0.09);
} else if (type === 'distance_hint') {
playTone(587, 0.14, 0, 'sine', 0.13);
playTone(880, 0.22, 0.12, 'sine', 0.13);
} else if (type === 'part2_revealed') {
playTone(659, 0.14, 0, 'triangle', 0.14);
playTone(880, 0.22, 0.1, 'triangle', 0.14);
} else if (type === 'round_end') {
playTone(523, 0.18, 0, 'triangle', 0.16);
playTone(659, 0.18, 0.14, 'triangle', 0.16);
playTone(784, 0.18, 0.28, 'triangle', 0.16);
playTone(1046, 0.55, 0.42, 'sine', 0.18);
}
}

// show or hide debug host drawer btns
// keeps production tv screen clean
function applyDebugMode(on) {
debugUnlocked = Boolean(on);
try {
if (window.sessionStorage) {
window.sessionStorage.setItem(
'tvDebug',
debugUnlocked ? '1' : '0'
);
}
} catch (e) {}
if (cornerHostBtn) {
cornerHostBtn.style.display = debugUnlocked
? 'block'
: 'none';
}
if (hostBtn) {
hostBtn.style.display = debugUnlocked
? 'inline-block'
: 'none';
}
if (!debugUnlocked && hostOpen) {
hostOpen = false;
if (hostFrame) {
hostFrame.style.display = 'none';
}
}
}

// count rapid secret taps to unlock debug
// five taps toggle hidden host controls
function registerSecretTap() {
secretClicks += 1;
if (secretTimer) clearTimeout(secretTimer);
secretTimer = setTimeout(function () {
secretClicks = 0;
}, 2400);
if (secretClicks >= 5) {
secretClicks = 0;
clearTimeout(secretTimer);
applyDebugMode(!debugUnlocked);
}
}

// load iframe lazily and toggle drawer
// avoids fetching /host in prod mode
function toggleHostDrawer() {
if (!hostFrame || !debugUnlocked) return;
if (!hostFrame.getAttribute('src')) {
hostFrame.setAttribute('src', '/host');
}
hostOpen = !hostOpen;
hostFrame.style.display = hostOpen
? 'block'
: 'none';
}

window.addEventListener(
'message',
function (e) {
if (
e &&
e.data &&
e.data.type === 'CLOSE_HOST_DRAWER'
) {
hostOpen = false;
if (hostFrame) {
hostFrame.style.display = 'none';
}
}
}
);

document.addEventListener('keydown', function (e) {
unlockAudio();
if (
e &&
e.ctrlKey &&
e.shiftKey &&
(e.key === 'D' || e.key === 'd')
) {
applyDebugMode(!debugUnlocked);
}
});
document.addEventListener('touchstart', unlockAudio);

if (secretZone) {
secretZone.onclick = registerSecretTap;
}
if (titleEl) {
titleEl.onclick = registerSecretTap;
}

(function checkInitialDebug() {
var hasQuery =
window.location.search.indexOf('debug=1') !==
-1;
var stored = false;
try {
stored =
window.sessionStorage &&
window.sessionStorage.getItem('tvDebug') ===
'1';
} catch (e) {}
applyDebugMode(hasQuery || stored);
})();

if (fsBtn) {
fsBtn.onclick = function () {
unlockAudio();
askFullscreen();
};
}
if (hostBtn) {
hostBtn.onclick = function () {
unlockAudio();
toggleHostDrawer();
};
}
if (cornerHostBtn) {
cornerHostBtn.onclick = function () {
unlockAudio();
toggleHostDrawer();
};
}
if (soundBtn) {
soundBtn.onclick = function () {
unlockAudio();
var xhr = new XMLHttpRequest();
xhr.open('POST', '/api/tv-sound', true);
xhr.setRequestHeader(
'Content-Type',
'application/json;charset=UTF-8'
);
xhr.onreadystatechange = function () {
if (xhr.readyState === 4 && xhr.status === 200) {
pollState();
}
};
xhr.send('{}');
};
}

// sync waiting overlay text and theme
// hides waiting screen when game active
function syncWaitingOverlay() {
var room = latestState && latestState.room;
var lang =
room && room.lang === 'en' ? 'en' : 'uk';
var theme =
(room && room.theme) || 'standard';
var t = window.APP_I18N[lang];

waitingEl.className = 'theme-' + theme;
titleEl.textContent = t.gameTitle;
subEl.textContent = t.gameSubtitle;
hintEl.textContent = t.waitingHint;
fsBtn.textContent = t.btnFullscreen;
hostBtn.textContent = t.btnOpenHost;
var sndOn = room ? room.tvSound : true;
soundBtn.textContent = sndOn
? t.btnSoundOn
: t.btnSoundOff;
soundBtn.className = sndOn
? 'wait-btn sound-on'
: 'wait-btn';

var showWait =
!room ||
!room.round ||
room.round.phase === 'waiting';
waitingEl.style.display = showWait
? 'flex'
: 'none';
}

var raf =
window.requestAnimationFrame ||
function (fn) {
return setTimeout(fn, 33);
};

// schedule canvas draw only when needed
// avoids burning tv cpu while idle
function kickRender() {
needsDraw = true;
if (!rafPending) {
rafPending = true;
raf(drawStep);
}
}

function drawStep() {
rafPending = false;
if (
ctx &&
window.TV_RENDERER &&
latestState &&
latestState.room
) {
var anim =
typeof window.TV_RENDERER.needsAnimation ===
'function'
? window.TV_RENDERER.needsAnimation(
latestState
)
: true;
if (needsDraw || anim) {
needsDraw = false;
window.TV_RENDERER.render(
ctx,
latestState
);
if (anim) {
rafPending = true;
raf(drawStep);
}
}
}
}

// poll /api/state every 450ms via xhr
// skips overlap and ignores stale state
function pollState() {
if (pollBusy) return;
pollBusy = true;
var xhr = new XMLHttpRequest();
xhr.open('GET', '/api/state', true);
xhr.onreadystatechange = function () {
if (xhr.readyState !== 4) return;
pollBusy = false;
if (xhr.status !== 200) return;
try {
var next = JSON.parse(
xhr.responseText
);
var ver = next.stateVersion || 0;
if (ver < lastStateVersion) {
return;
}
var changed =
ver !== lastStateVersion || !hasPolledOnce;
lastStateVersion = ver;
latestState = next;
var evs = next.events || [];
if (!hasPolledOnce) {
hasPolledOnce = true;
for (var k = 0; k < evs.length; k++) {
if (evs[k].id > lastEventId) {
lastEventId = evs[k].id;
}
}
} else {
var theme =
(next.room && next.room.theme) ||
'standard';
for (var i = 0; i < evs.length; i++) {
if (evs[i].id > lastEventId) {
lastEventId = evs[i].id;
changed = true;
if (window.TV_RENDERER) {
window.TV_RENDERER.triggerEvent(
evs[i]
);
}
playEventSound(evs[i].type, theme);
}
}
}
if (changed) {
syncWaitingOverlay();
kickRender();
}
} catch (e) {}
};
xhr.send();
}

// apply uniform tv scale on resize
// keeps 16:9 canvas crisp on any screen
function onResize() {
if (window.TV_SCALE) {
window.TV_SCALE.applyScale(stageEl);
}
kickRender();
}

window.addEventListener('resize', onResize);
onResize();
pollState();
setInterval(pollState, 450);
})();
