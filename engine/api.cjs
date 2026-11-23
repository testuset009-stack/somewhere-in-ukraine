// express api routes for tv and phone
// maps http calls to game engine
var express = require('express');
var os = require('os');
var path = require('path');
var game = require('./game.cjs');
var ukraine = require('./ukraine.cjs');
var questions = require('./questions.cjs');

var router = express.Router();

// block browser and webview caching on api
// stops older android tv webviews freezing
router.use('/api', function (req, res, next) {
res.setHeader(
'Cache-Control',
'no-store, no-cache, must-revalidate'
);
res.setHeader('Pragma', 'no-cache');
res.setHeader('Expires', '0');
next();
});

// find local wifi ipv4 address
// helps host open tv url on lan
function getLocalIp() {
var nets = os.networkInterfaces();
for (var name in nets) {
if (!nets.hasOwnProperty(name)) {
continue;
}
var list = nets[name];
for (var i = 0; i < list.length; i++) {
var net = list[i];
if (
net.family === 'IPv4' &&
!net.internal
) {
return net.address;
}
}
}
return '127.0.0.1';
}

// read pin from header or query string
// lets download links pass pin cleanly
function readReqPin(req) {
return (
req.get('X-Host-Pin') ||
(req.query && req.query.pin) ||
''
);
}

// guard host routes when pin is enabled
// passes straight through when pin is off
function requireHostPin(req, res, next) {
if (game.checkHostPin(readReqPin(req))) {
next();
return;
}
res.status(401).json({
ok: false,
pinRequired: true,
error: 'PIN required'
});
}

// wrap action route with json reply
// returns updated host state on success
function runAction(fn) {
return function (req, res) {
try {
fn(req, res);
res.json({
ok: true,
state: game.getHostState()
});
} catch (err) {
res.status(400).json({
ok: false,
error: err.message || 'Action error'
});
}
};
}

// lightweight health check for launchers
// tells wrapper when server is ready
router.get('/health', function (req, res) {
res.json({
ok: true,
uptime: Math.floor(process.uptime())
});
});

// send redacted tv state to open screen
// hides secret answers during asking phase
router.get('/api/state', function (req, res) {
res.json(game.getTvState());
});

// send full state to host controller
// protected when optional host pin is on
router.get(
'/api/host-state',
requireHostPin,
function (req, res) {
res.json(game.getHostState());
}
);

// check entered host pin code
// returns 401 when pin does not match
router.post('/api/verify-pin', function (req, res) {
var b = req.body || {};
if (game.checkHostPin(b.pin)) {
res.json({ ok: true });
return;
}
res.status(401).json({
ok: false,
pinRequired: true,
error: 'Wrong PIN'
});
});

// set or disable optional host pin code
// requires current pin if already enabled
router.post(
'/api/host-pin',
requireHostPin,
runAction(function (req) {
var b = req.body || {};
game.setHostPin(b.pin);
})
);

// toggle tv sound from waiting screen
// works without host pin on tv display
router.post('/api/tv-sound', function (req, res) {
try {
game.toggleTvSound();
res.json({
ok: true,
state: game.getTvState()
});
} catch (err) {
res.status(400).json({
ok: false,
error: err.message || 'Action error'
});
}
});

// send local lan ip and port
// displayed in host top bar
router.get('/api/ip', function (req, res) {
res.json({
ip: getLocalIp(),
port: process.env.PORT || 3000
});
});

// send country directory list
// used by phone distance hint picker
router.get('/api/countries', function (req, res) {
res.json({
ok: true,
countries: ukraine.listCountries()
});
});

// send full question list of active pack
// protected because it contains answers
router.get(
'/api/pack-questions',
requireHostPin,
function (req, res) {
var state = game.getHostState();
var file =
(req.query && req.query.file) ||
(state.room && state.room.packFile) ||
'facts_uk.txt';
var pack = questions.loadPackByFile(file);
res.json({
ok: true,
fileName: pack.fileName,
questions: pack.list
});
}
);

// download raw txt pack or template
// sends attachment header for browser
router.get(
'/api/download-pack',
requireHostPin,
function (req, res) {
var file =
(req.query && req.query.file) ||
'facts_uk.txt';
var safe = path.basename(String(file));
var full = questions.resolvePackPath(safe);
if (!full) {
res.status(404).send('Pack not found');
return;
}
res.download(full, safe);
}
);

// upload custom txt question pack
// saves file and selects it in room
router.post(
'/api/upload-pack',
requireHostPin,
function (req, res) {
try {
var body = req.body || {};
var saved = questions.savePackFile(
body.fileName,
body.content
);
var st = game.getHostState();
if (st.room) {
game.updateSettings({
packFile: saved.fileName
});
}
res.json({
ok: true,
saved: saved,
state: game.getHostState()
});
} catch (err) {
res.status(400).json({
ok: false,
error: err.message
});
}
}
);

router.post(
'/api/create-room',
requireHostPin,
runAction(function (req) {
var b = req.body || {};
game.createRoom(b.name, b.lang, b.theme);
})
);

router.post(
'/api/select-room',
requireHostPin,
runAction(function (req) {
var b = req.body || {};
game.selectRoom(b.roomId);
})
);

router.post(
'/api/leave-room',
requireHostPin,
runAction(function () {
game.leaveRoom();
})
);

router.post(
'/api/delete-room',
requireHostPin,
runAction(function (req) {
var b = req.body || {};
game.deleteRoom(b.roomId);
})
);

router.post(
'/api/rename-room',
requireHostPin,
runAction(function (req) {
var b = req.body || {};
game.renameRoom(b.name);
})
);

router.post(
'/api/settings',
requireHostPin,
runAction(function (req) {
game.updateSettings(req.body || {});
})
);

router.post(
'/api/add-team',
requireHostPin,
runAction(function (req) {
var b = req.body || {};
game.addTeam(b.name);
})
);

router.post(
'/api/remove-team',
requireHostPin,
runAction(function (req) {
var b = req.body || {};
game.removeTeam(b.teamId);
})
);

router.post(
'/api/set-active-team',
requireHostPin,
runAction(function (req) {
var b = req.body || {};
game.setActiveTeam(b.teamId);
})
);

router.post(
'/api/adjust-score',
requireHostPin,
runAction(function (req) {
var b = req.body || {};
game.adjustScore(b.teamId, b.delta);
})
);

router.post(
'/api/start-tv',
requireHostPin,
runAction(function () {
game.startSessionOnTv();
})
);

router.post(
'/api/new-round',
requireHostPin,
runAction(function () {
game.startNewRound();
})
);

router.post(
'/api/reset-asked',
requireHostPin,
runAction(function () {
game.resetAskedHistory();
})
);

router.post(
'/api/draw-question',
requireHostPin,
runAction(function (req) {
var b = req.body || {};
game.drawNextQuestion(b.number);
})
);

router.post(
'/api/wrong-answer',
requireHostPin,
runAction(function (req) {
var b = req.body || {};
game.recordWrongAnswer(
Boolean(b.advanceTurn)
);
})
);

router.post(
'/api/distance-hint',
requireHostPin,
runAction(function (req) {
var b = req.body || {};
game.giveDistanceHint(
b.guessedCode,
b.manualTier
);
})
);

router.post(
'/api/reveal-part2',
requireHostPin,
runAction(function () {
game.revealPart2();
})
);

router.post(
'/api/correct-answer',
requireHostPin,
runAction(function (req) {
var b = req.body || {};
game.recordCorrectAnswer(b.teamId);
})
);

router.post(
'/api/skip-question',
requireHostPin,
runAction(function (req) {
var b = req.body || {};
game.skipQuestion(Boolean(b.reveal));
})
);

router.post(
'/api/next-ready',
requireHostPin,
runAction(function () {
game.nextReady();
})
);

router.post(
'/api/finish-round',
requireHostPin,
runAction(function (req) {
var b = req.body || {};
game.finishRound(b.teamLabel);
})
);

router.post(
'/api/undo',
requireHostPin,
runAction(function () {
game.undoLast();
})
);

router.get(
'/api/export-json',
requireHostPin,
function (req, res) {
var data = game.exportAll();
res.setHeader(
'Content-Type',
'application/json; charset=utf-8'
);
res.setHeader(
'Content-Disposition',
'attachment; filename="ukraine-quiz-backup.json"'
);
res.send(JSON.stringify(data, null, 2));
}
);

router.post(
'/api/import-json',
requireHostPin,
runAction(function (req) {
var b = req.body || {};
game.importAll(b.data ? b.data : b);
})
);

module.exports = router;
