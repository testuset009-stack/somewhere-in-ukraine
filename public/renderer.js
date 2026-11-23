// procedural 1920x1080 canvas tv renderer
// supports 4 themes and strict es5
window.TV_RENDERER = (function () {
var W = 1920;
var H = 1080;

var animState = {
revealCode: null,
revealStartMs: 0,
revealDuration: 950,
labelDuration: 2200,
hintCode: null,
hintTier: null,
hintStartMs: 0,
hintDuration: 4200,
snowflakes: []
};

// make snow particle list for christmas
// populates 95 crisp falling flakes
function initSnow() {
if (animState.snowflakes.length > 0) {
return;
}
for (var i = 0; i < 95; i++) {
animState.snowflakes.push({
x: Math.random() * W,
y: Math.random() * H,
r: 1.6 + Math.random() * 2.8,
vy: 0.45 + Math.random() * 1.15,
vx: -0.4 + Math.random() * 0.8,
alpha: 0.28 + Math.random() * 0.62
});
}
}

// return color tokens for active theme
// maps pub, standard, dark, and christmas
function getThemePalette(theme) {
if (theme === 'pub') {
return {
seaTop: '#f8f3e6',
seaBot: '#ebe1c8',
grid: 'rgba(7,46,27,0.075)',
land: '#d5dec6',
border: '#244935',
paintedBorder: '#fdfaf1',
panelBg: 'rgba(253,250,241,0.97)',
panelBorder: '#072e1b',
innerTrim: '#b58b42',
panelText: '#072e1b',
mutedText: '#496655',
accent: '#c81e06',
accentText: '#fdfaf1',
part2Bg: 'rgba(216,30,5,0.08)',
part2Border: '#d81e05',
badgeBg: '#072e1b',
badgeText: '#f4f7f5',
ptsFullBg: '#14532d',
ptsHalfBg: '#d81e05',
revealColor: '#0f5c34',
activeRowBg: 'rgba(7,46,27,0.10)',
finishMapBg: 'rgba(7,46,27,0.045)',
headingFont: 'Georgia, serif',
floatStroke: 'rgba(7,46,27,0.94)',
floatFill: '#fdfaf1'
};
}
if (theme === 'standard') {
return {
seaTop: '#0e3c6b',
seaBot: '#1b5d9a',
grid: 'rgba(255,255,255,0.10)',
land: '#e2e8f0',
border: '#475569',
paintedBorder: '#ffffff',
panelBg: 'rgba(255,255,255,0.95)',
panelBorder: '#2563eb',
innerTrim: null,
panelText: '#0f172a',
mutedText: '#475569',
accent: '#d97706',
accentText: '#ffffff',
part2Bg: 'rgba(245,158,11,0.16)',
part2Border: '#d97706',
badgeBg: '#1e40af',
badgeText: '#ffffff',
ptsFullBg: '#059669',
ptsHalfBg: '#d97706',
revealColor: '#059669',
activeRowBg: 'rgba(59,130,246,0.22)',
finishMapBg: 'rgba(2,6,23,0.34)',
headingFont: 'sans-serif',
floatStroke: 'rgba(2,6,23,0.9)',
floatFill: '#ffffff'
};
}
if (theme === 'christmas') {
return {
seaTop: '#051a17',
seaBot: '#0c2f29',
grid: 'rgba(167,243,208,0.08)',
land: '#1c3b35',
border: '#86efac',
paintedBorder: '#ffffff',
panelBg: 'rgba(12,35,30,0.94)',
panelBorder: '#f59e0b',
innerTrim: null,
panelText: '#fef3c7',
mutedText: '#a7f3d0',
accent: '#dc2626',
accentText: '#ffffff',
part2Bg: 'rgba(245,158,11,0.18)',
part2Border: '#fbbf24',
badgeBg: '#b91c1c',
badgeText: '#fef3c7',
ptsFullBg: '#059669',
ptsHalfBg: '#d97706',
revealColor: '#10b981',
activeRowBg: 'rgba(59,130,246,0.22)',
finishMapBg: 'rgba(2,6,23,0.34)',
headingFont: 'sans-serif',
floatStroke: 'rgba(2,6,23,0.9)',
floatFill: '#ffffff'
};
}
return {
seaTop: '#090d1a',
seaBot: '#111827',
grid: 'rgba(148,163,184,0.10)',
land: '#1e293b',
border: '#94a3b8',
paintedBorder: '#ffffff',
panelBg: 'rgba(15,23,42,0.94)',
panelBorder: '#38bdf8',
innerTrim: null,
panelText: '#f8fafc',
mutedText: '#94a3b8',
accent: '#f59e0b',
accentText: '#0f172a',
part2Bg: 'rgba(251,191,36,0.15)',
part2Border: '#fbbf24',
badgeBg: '#0284c7',
badgeText: '#ffffff',
ptsFullBg: '#059669',
ptsHalfBg: '#d97706',
revealColor: '#10b981',
activeRowBg: 'rgba(59,130,246,0.22)',
finishMapBg: 'rgba(2,6,23,0.34)',
headingFont: 'sans-serif',
floatStroke: 'rgba(2,6,23,0.9)',
floatFill: '#ffffff'
};
}

// trigger reveal wipe or hint radar anim
// called from tv.js when event arrives
function triggerEvent(ev) {
if (!ev || !ev.type) {
return;
}
if (
ev.type === 'country_painted' ||
ev.type === 'skip_reveal'
) {
animState.revealCode =
ev.payload && ev.payload.code
? ev.payload.code
: null;
animState.revealStartMs = Date.now();
} else if (ev.type === 'distance_hint') {
animState.hintCode =
ev.payload && ev.payload.guessedCode
? ev.payload.guessedCode
: null;
animState.hintTier =
ev.payload && ev.payload.tier
? ev.payload.tier
: 'far';
animState.hintStartMs = Date.now();
}
}

// fit ukraine viewbox inside target box
// keeps real map aspect ratio undistorted
function getMapTransform(mapBox) {
var vw =
(window.UKRAINE_MAP &&
window.UKRAINE_MAP.viewW) ||
320;
var vh =
(window.UKRAINE_MAP &&
window.UKRAINE_MAP.viewH) ||
218;
var sc = Math.min(
mapBox.w / vw,
mapBox.h / vh
);
var dw = vw * sc;
var dh = vh * sc;
return {
sc: sc,
ox: mapBox.x + (mapBox.w - dw) / 2,
oy: mapBox.y + (mapBox.h - dh) / 2
};
}

// project ukraine map x coord to canvas
// scales uniformly inside centered box
function projX(x, mapBox) {
var tr = getMapTransform(mapBox);
return tr.ox + x * tr.sc;
}

// project ukraine map y coord to canvas
// scales uniformly inside centered box
function projY(y, mapBox) {
var tr = getMapTransform(mapBox);
return tr.oy + y * tr.sc;
}

// trace all polygons for one country
// creates closed canvas path
function traceCountry(ctx, c, mapBox) {
ctx.beginPath();
for (var p = 0; p < c.polys.length; p++) {
var poly = c.polys[p];
if (!poly || poly.length < 2) {
continue;
}
ctx.moveTo(
projX(poly[0][0], mapBox),
projY(poly[0][1], mapBox)
);
for (var k = 1; k < poly.length; k++) {
ctx.lineTo(
projX(poly[k][0], mapBox),
projY(poly[k][1], mapBox)
);
}
ctx.closePath();
}
}

// wrap long text across multiple lines
// measures width on 2d canvas context
function wrapText(ctx, text, maxW) {
var words = String(text || '').split(/\s+/);
var lines = [];
var cur = '';
for (var i = 0; i < words.length; i++) {
var w = words[i];
if (!w) continue;
var test = cur ? cur + ' ' + w : w;
if (
cur &&
ctx.measureText(test).width > maxW
) {
lines.push(cur);
cur = w;
} else {
cur = test;
}
}
if (cur) {
lines.push(cur);
}
return lines;
}

// draw rounded rectangle path helper
// avoids roundRect missing on kitkat
function drawRoundRect(
ctx,
x,
y,
w,
h,
r
) {
ctx.beginPath();
ctx.moveTo(x + r, y);
ctx.lineTo(x + w - r, y);
ctx.quadraticCurveTo(x + w, y, x + w, y + r);
ctx.lineTo(x + w, y + h - r);
ctx.quadraticCurveTo(
x + w,
y + h,
x + w - r,
y + h
);
ctx.lineTo(x + r, y + h);
ctx.quadraticCurveTo(x, y + h, x, y + h - r);
ctx.lineTo(x, y + r);
ctx.quadraticCurveTo(x, y, x + r, y);
ctx.closePath();
}

// draw card shell with optional trim
// adds brass inset rule on pub theme
function drawCardBox(
ctx,
x,
y,
w,
h,
r,
pal,
strokeCol,
lw
) {
drawRoundRect(ctx, x, y, w, h, r);
ctx.fillStyle = pal.panelBg;
ctx.fill();
ctx.strokeStyle = strokeCol;
ctx.lineWidth = lw;
ctx.stroke();
if (pal.innerTrim) {
drawRoundRect(
ctx,
x + 7,
y + 7,
w - 14,
h - 14,
Math.max(6, r - 5)
);
ctx.strokeStyle = pal.innerTrim;
ctx.lineWidth = 1.25;
ctx.stroke();
}
}

// find region geometry record by code
// scans loaded UKRAINE_MAP array
function findMapCountry(code) {
if (!window.UKRAINE_MAP) return null;
var list = window.UKRAINE_MAP.countries;
for (var i = 0; i < list.length; i++) {
if (list[i].code === code) {
return list[i];
}
}
return null;
}

// draw pointed almond bract scale
// builds engraved hop cone lattice
function drawHopScale(
ctx,
x,
y,
w,
h,
fill,
stroke
) {
ctx.beginPath();
ctx.moveTo(x, y - h);
ctx.quadraticCurveTo(x + w, y, x, y + h);
ctx.quadraticCurveTo(x - w, y, x, y - h);
ctx.closePath();
ctx.fillStyle = fill;
ctx.fill();
ctx.strokeStyle = stroke;
ctx.lineWidth = 1.05;
ctx.stroke();
}

// draw stylized engraved hop strobile
// uses pointed scales and brass rib
function drawOrnamentHop(
ctx,
x,
y,
ang,
sc
) {
ctx.save();
ctx.translate(x, y);
ctx.rotate(ang);
ctx.scale(sc, sc);

var ink = '#163c27';
var washA = 'rgba(72,114,66,0.28)';
var washB = 'rgba(116,148,78,0.34)';
var washC = 'rgba(164,174,98,0.38)';

ctx.strokeStyle = ink;
ctx.lineWidth = 1.3;
ctx.beginPath();
ctx.moveTo(0, -18);
ctx.quadraticCurveTo(2, -14, 0, -11);
ctx.stroke();

drawHopScale(ctx, -5.5, -6, 4.8, 6.2, washA, ink);
drawHopScale(ctx, 5.5, -6, 4.8, 6.2, washA, ink);
drawHopScale(ctx, 0, -5, 5.4, 6.8, washB, ink);

drawHopScale(ctx, -6.5, 1.5, 5.2, 6.8, washA, ink);
drawHopScale(ctx, 6.5, 1.5, 5.2, 6.8, washA, ink);
drawHopScale(ctx, 0, 2.5, 5.8, 7.2, washB, ink);

drawHopScale(ctx, -4.5, 9, 4.4, 6.0, washB, ink);
drawHopScale(ctx, 4.5, 9, 4.4, 6.0, washB, ink);
drawHopScale(ctx, 0, 10.5, 4.8, 6.6, washC, ink);

drawHopScale(ctx, 0, 16, 3.3, 5.0, washC, ink);

ctx.strokeStyle = 'rgba(181,139,66,0.58)';
ctx.lineWidth = 0.9;
ctx.beginPath();
ctx.moveTo(0, -8);
ctx.lineTo(0, 15);
ctx.stroke();
ctx.restore();
}

// draw engraved three-lobed hop leaf
// uses translucent sage wash and veins
function drawOrnamentLeaf(
ctx,
x,
y,
ang,
sc
) {
ctx.save();
ctx.translate(x, y);
ctx.rotate(ang);
ctx.scale(sc, sc);

ctx.fillStyle = 'rgba(54,108,68,0.20)';
ctx.strokeStyle = '#163c27';
ctx.lineWidth = 1.15;
ctx.beginPath();
ctx.moveTo(0, 8);
ctx.quadraticCurveTo(-14, 6, -20, -6);
ctx.quadraticCurveTo(-10, -7, -8, -12);
ctx.quadraticCurveTo(-6, -22, 0, -28);
ctx.quadraticCurveTo(6, -22, 8, -12);
ctx.quadraticCurveTo(10, -7, 20, -6);
ctx.quadraticCurveTo(14, 6, 0, 8);
ctx.closePath();
ctx.fill();
ctx.stroke();

ctx.strokeStyle = 'rgba(22,60,39,0.65)';
ctx.lineWidth = 0.9;
ctx.beginPath();
ctx.moveTo(0, 8);
ctx.lineTo(0, -23);
ctx.moveTo(0, 1);
ctx.lineTo(-14, -5);
ctx.moveTo(0, 1);
ctx.lineTo(14, -5);
ctx.stroke();
ctx.restore();
}

// draw filigree spiral volute curl
// finishes scrollwork vines cleanly
function drawVolute(
ctx,
x,
y,
ang,
sc,
col
) {
ctx.save();
ctx.translate(x, y);
ctx.rotate(ang);
ctx.scale(sc, sc);
ctx.strokeStyle = col;
ctx.lineWidth = 1.25;
ctx.beginPath();
ctx.moveTo(0, 0);
ctx.quadraticCurveTo(12, -10, 18, 0);
ctx.quadraticCurveTo(22, 10, 12, 12);
ctx.quadraticCurveTo(6, 12, 7, 6);
ctx.quadraticCurveTo(8, 3, 12, 5);
ctx.stroke();
ctx.fillStyle = '#b58b42';
ctx.beginPath();
ctx.arc(11.5, 6.2, 1.7, 0, Math.PI * 2);
ctx.fill();
ctx.restore();
}

// draw symmetrical engraved hop corner
// mirrors cleanly onto any frame corner
function drawHopCornerOrnament(
ctx,
ox,
oy,
sx,
sy,
sc
) {
ctx.save();
ctx.translate(ox, oy);
ctx.scale(sx * sc, sy * sc);
ctx.globalAlpha = 0.82;

var ink = '#163c27';
var gold = 'rgba(181,139,66,0.78)';

// primary intertwined corner scrollwork
// hugs both rails with double vine curve
ctx.strokeStyle = ink;
ctx.lineWidth = 1.6;
ctx.beginPath();
ctx.moveTo(10, 10);
ctx.bezierCurveTo(
56,
6,
106,
34,
162,
16
);
ctx.bezierCurveTo(
196,
6,
218,
20,
232,
14
);
ctx.stroke();

ctx.beginPath();
ctx.moveTo(10, 10);
ctx.bezierCurveTo(
6,
54,
34,
96,
16,
146
);
ctx.bezierCurveTo(
6,
174,
20,
192,
14,
206
);
ctx.stroke();

ctx.strokeStyle = gold;
ctx.lineWidth = 1.1;
ctx.beginPath();
ctx.moveTo(14, 14);
ctx.bezierCurveTo(
64,
32,
112,
4,
176,
24
);
ctx.stroke();

ctx.beginPath();
ctx.moveTo(14, 14);
ctx.bezierCurveTo(
32,
60,
4,
104,
24,
160
);
ctx.stroke();

drawVolute(ctx, 230, 13, -0.2, 0.88, ink);
drawVolute(ctx, 174, 23, 0.25, 0.68, gold);
drawVolute(ctx, 13, 204, 1.4, 0.88, ink);
drawVolute(ctx, 23, 158, 1.85, 0.68, gold);

// diagonal corner finial & hop motif
// anchors ornament at frame intersection
drawOrnamentLeaf(ctx, 64, 24, 1.25, 0.84);
drawOrnamentLeaf(ctx, 24, 62, -0.32, 0.84);
drawOrnamentLeaf(ctx, 142, 24, 1.48, 0.72);
drawOrnamentLeaf(ctx, 24, 128, -0.1, 0.72);

drawOrnamentHop(ctx, 44, 44, -0.78, 0.96);
drawOrnamentHop(ctx, 114, 28, -0.25, 0.76);
drawOrnamentHop(ctx, 188, 22, -0.12, 0.64);
drawOrnamentHop(ctx, 28, 104, -1.32, 0.76);
drawOrnamentHop(ctx, 22, 168, -1.45, 0.64);

ctx.fillStyle = ink;
ctx.beginPath();
ctx.arc(10, 10, 4.2, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = '#b58b42';
ctx.beginPath();
ctx.arc(10, 10, 2.1, 0, Math.PI * 2);
ctx.fill();

ctx.restore();
}

// draw compact horizontal hop corner
// stays neatly above left riddle card
function drawTopLeftHopScroll(ctx) {
ctx.save();
ctx.translate(19, 19);
ctx.globalAlpha = 0.82;

var ink = '#163c27';
var gold = 'rgba(181,139,66,0.78)';

ctx.strokeStyle = ink;
ctx.lineWidth = 1.5;
ctx.beginPath();
ctx.moveTo(8, 24);
ctx.bezierCurveTo(
14,
8,
64,
6,
124,
18
);
ctx.bezierCurveTo(
178,
28,
226,
8,
274,
15
);
ctx.stroke();

ctx.strokeStyle = gold;
ctx.lineWidth = 1.05;
ctx.beginPath();
ctx.moveTo(14, 14);
ctx.bezierCurveTo(
74,
26,
136,
4,
212,
20
);
ctx.stroke();

drawVolute(ctx, 272, 14, -0.15, 0.78, ink);
drawVolute(ctx, 210, 19, 0.2, 0.62, gold);

drawOrnamentLeaf(ctx, 56, 18, 1.38, 0.68);
drawOrnamentLeaf(ctx, 146, 19, 1.52, 0.64);
drawOrnamentLeaf(ctx, 222, 16, 1.58, 0.56);

drawOrnamentHop(ctx, 30, 22, -0.58, 0.66);
drawOrnamentHop(ctx, 98, 20, -0.22, 0.64);
drawOrnamentHop(ctx, 184, 18, -0.12, 0.58);

ctx.restore();
}

// draw symmetric filigree hop crest
// crowns scoreboard or logo underline
function drawHopStripOrnament(
ctx,
cx,
cy,
halfW,
sc
) {
ctx.save();
ctx.translate(cx, cy);
ctx.scale(sc, sc);
ctx.globalAlpha = 0.84;

var ink = '#163c27';
var gold = 'rgba(181,139,66,0.82)';

var sides = [-1, 1];
for (var s = 0; s < sides.length; s++) {
ctx.save();
ctx.scale(sides[s], 1);

ctx.strokeStyle = ink;
ctx.lineWidth = 1.5;
ctx.beginPath();
ctx.moveTo(6, 0);
ctx.bezierCurveTo(
halfW * 0.34,
-12,
halfW * 0.68,
9,
halfW,
-3
);
ctx.stroke();

ctx.strokeStyle = gold;
ctx.lineWidth = 1.05;
ctx.beginPath();
ctx.moveTo(12, 2);
ctx.bezierCurveTo(
halfW * 0.42,
8,
halfW * 0.72,
-10,
halfW * 0.88,
2
);
ctx.stroke();

drawVolute(ctx, halfW - 2, -3, -0.25, 0.72, ink);
drawOrnamentLeaf(
ctx,
halfW * 0.48,
-3,
1.42,
0.64
);
drawOrnamentHop(
ctx,
halfW * 0.28,
2,
-0.75,
0.58
);
ctx.restore();
}

drawOrnamentHop(ctx, 0, 5, 0, 0.72);
ctx.restore();
}

// draw subtle antique atlas compass rose
// sits in open southeast sea corner
function drawCompassRose(ctx, cx, cy, rad) {
ctx.save();
ctx.translate(cx, cy);
ctx.globalAlpha = 0.24;

ctx.strokeStyle = '#072e1b';
ctx.lineWidth = 1.6;
ctx.beginPath();
ctx.arc(0, 0, rad, 0, Math.PI * 2);
ctx.stroke();

ctx.strokeStyle = '#b58b42';
ctx.lineWidth = 1.2;
ctx.beginPath();
ctx.arc(0, 0, rad - 7, 0, Math.PI * 2);
ctx.stroke();

var angles = [0, 90, 180, 270];
for (var i = 0; i < angles.length; i++) {
var a = (angles[i] * Math.PI) / 180;
ctx.save();
ctx.rotate(a);
ctx.fillStyle = '#072e1b';
ctx.beginPath();
ctx.moveTo(0, -rad + 6);
ctx.lineTo(9, 0);
ctx.lineTo(0, 0);
ctx.closePath();
ctx.fill();

ctx.fillStyle = '#b58b42';
ctx.beginPath();
ctx.moveTo(0, -rad + 6);
ctx.lineTo(-9, 0);
ctx.lineTo(0, 0);
ctx.closePath();
ctx.fill();
ctx.restore();
}

var diag = [45, 135, 225, 315];
for (var d = 0; d < diag.length; d++) {
var da = (diag[d] * Math.PI) / 180;
ctx.save();
ctx.rotate(da);
ctx.fillStyle = '#496655';
ctx.beginPath();
ctx.moveTo(0, -(rad * 0.62));
ctx.lineTo(5, 0);
ctx.lineTo(-5, 0);
ctx.closePath();
ctx.fill();
ctx.restore();
}

ctx.fillStyle = '#072e1b';
ctx.font = 'bold 14px Georgia, serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('N', 0, -rad - 11);
ctx.fillText('S', 0, rad + 12);
ctx.fillText('E', rad + 11, 0);
ctx.fillText('W', -rad - 12, 0);
ctx.restore();
}

// draw heritage frame and hop ornament
// keeps map and text totally unobstructed
function drawPubDecor(ctx) {
ctx.save();

ctx.strokeStyle = '#072e1b';
ctx.lineWidth = 2.5;
ctx.strokeRect(12, 12, W - 24, H - 24);

ctx.strokeStyle = '#b58b42';
ctx.lineWidth = 1.25;
ctx.strokeRect(19, 19, W - 38, H - 38);

var corners = [
[19, 19],
[W - 19, 19],
[19, H - 19],
[W - 19, H - 19]
];
for (var c = 0; c < corners.length; c++) {
ctx.fillStyle = '#072e1b';
ctx.beginPath();
ctx.arc(
corners[c][0],
corners[c][1],
4.5,
0,
Math.PI * 2
);
ctx.fill();
ctx.fillStyle = '#b58b42';
ctx.beginPath();
ctx.arc(
corners[c][0],
corners[c][1],
2,
0,
Math.PI * 2
);
ctx.fill();
}

drawCompassRose(ctx, 1724, 888, 46);
drawHopCornerOrnament(
ctx,
W - 19,
H - 19,
-1,
-1,
1.02
);
drawHopCornerOrnament(
ctx,
W - 19,
19,
-1,
1,
0.96
);
drawTopLeftHopScroll(ctx);

ctx.restore();
}

// draw filigree hop crest on scoreboard
// matches engraved botanical pub border
function drawPubScoreCrest(ctx, x, y, w) {
drawHopStripOrnament(
ctx,
x + w / 2,
y - 2,
112,
0.76
);
}

// draw sea background and theme decor
// picks snow/garlands or pub hop vines
function drawBackdrop(ctx, pal, theme, now) {
var grad = ctx.createLinearGradient(
0,
0,
0,
H
);
grad.addColorStop(0, pal.seaTop);
grad.addColorStop(1, pal.seaBot);
ctx.fillStyle = grad;
ctx.fillRect(0, 0, W, H);

ctx.strokeStyle = pal.grid;
ctx.lineWidth = 1.5;
for (var gx = 160; gx < W; gx += 220) {
ctx.beginPath();
ctx.moveTo(gx, 0);
ctx.lineTo(gx, H);
ctx.stroke();
}
for (var gy = 140; gy < H; gy += 180) {
ctx.beginPath();
ctx.moveTo(0, gy);
ctx.lineTo(W, gy);
ctx.stroke();
}

if (theme === 'christmas') {
drawSideChristmasDecor(ctx, now);
} else if (theme === 'pub') {
drawPubDecor(ctx);
}
}

// draw vertical bulb garland at edge
// keeps side borders festive and thin
function drawEdgeGarland(
ctx,
edgeX,
yStart,
yEnd,
phase
) {
var bulbColors = [
'#ef4444',
'#fbbf24',
'#22c55e',
'#38bdf8'
];
ctx.strokeStyle = 'rgba(22,163,74,0.7)';
ctx.lineWidth = 2.5;
ctx.beginPath();
ctx.moveTo(edgeX, yStart);
for (var wy = yStart; wy <= yEnd; wy += 42) {
ctx.lineTo(
edgeX + Math.sin(wy * 0.03) * 4,
wy
);
}
ctx.stroke();

for (var by = yStart + 10; by <= yEnd; by += 68) {
var idx = Math.floor(by / 68);
var col =
bulbColors[
(idx + phase) % bulbColors.length
];
var bx = edgeX + Math.sin(by * 0.03) * 4;
ctx.fillStyle = col;
ctx.beginPath();
ctx.arc(bx, by, 4.8, 0, Math.PI * 2);
ctx.fill();
}
}

// draw rich snow and both side garlands
// keeps top clear while framing sides
function drawSideChristmasDecor(ctx, now) {
initSnow();
var flakes = animState.snowflakes;
ctx.save();
for (var i = 0; i < flakes.length; i++) {
var f = flakes[i];
f.y += f.vy;
f.x += f.vx;
if (f.y > H + 10) {
f.y = -10;
f.x = Math.random() * W;
}
if (f.x < -10) f.x = W + 10;
if (f.x > W + 10) f.x = -10;
ctx.fillStyle =
'rgba(255,255,255,' + f.alpha + ')';
ctx.beginPath();
ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
ctx.fill();
}

var phase = Math.floor(now / 650);
drawEdgeGarland(ctx, 15, 72, H - 44, phase);
drawEdgeGarland(
ctx,
W - 16,
44,
H - 44,
phase + 1
);
ctx.restore();
}

// draw compact garland above scoreboard
// accents scoreboard edge on christmas
function drawScoreboardGarland(
ctx,
x,
y,
w,
now
) {
var bulbColors = [
'#ef4444',
'#fbbf24',
'#22c55e',
'#38bdf8'
];
var phase = Math.floor(now / 650);
ctx.save();
ctx.strokeStyle = '#15803d';
ctx.lineWidth = 4;
ctx.beginPath();
ctx.moveTo(x + 14, y - 3);
for (var gx = x + 28; gx <= x + w - 14; gx += 26) {
var sag = Math.sin(((gx - x) / w) * Math.PI) * 5;
ctx.lineTo(gx, y - 5 + sag);
}
ctx.stroke();

for (var bx = x + 22; bx <= x + w - 20; bx += 38) {
var idx = Math.floor(bx / 38);
var col =
bulbColors[
(idx + phase) % bulbColors.length
];
var bSag = Math.sin(((bx - x) / w) * Math.PI) * 5;
ctx.fillStyle = col;
ctx.beginPath();
ctx.arc(bx, y - 5 + bSag, 4.2, 0, Math.PI * 2);
ctx.fill();
}
ctx.restore();
}

// compute map box for active phase
// makes map full height in live play
function getMapBox(room) {
var phase =
room && room.round ? room.round.phase : 'ready';
if (phase === 'finished') {
return {
x: 632,
y: 54,
w: 1236,
h: 924
};
}
return {
x: 526,
y: 26,
w: 1352,
h: 1010
};
}

// draw floating upward country name
// scales up and fades out after fill
function drawFloatingRevealLabel(
ctx,
mapBox,
pal,
lang,
now
) {
if (!animState.revealCode) {
return;
}
var elapsed = now - animState.revealStartMs;
if (
elapsed < animState.revealDuration ||
elapsed >
animState.revealDuration +
animState.labelDuration
) {
return;
}
var lc = findMapCountry(animState.revealCode);
if (!lc) {
return;
}
var lt =
(elapsed - animState.revealDuration) /
animState.labelDuration;
var ease = 1 - Math.pow(1 - lt, 3);
var lx = projX(lc.cx, mapBox);
var ly = projY(lc.cy, mapBox) - 125 * ease;
var scale = 1.0 + 1.15 * ease;
var alpha =
lt < 0.14
? lt / 0.14
: Math.max(0, 1 - (lt - 0.14) / 0.86);
var label = lang === 'en' ? lc.en : lc.uk;

ctx.save();
ctx.globalAlpha = alpha;
ctx.translate(lx, ly);
ctx.scale(scale, scale);
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.font = 'bold 28px ' + pal.headingFont;
ctx.lineWidth = 6;
ctx.strokeStyle = pal.floatStroke;
ctx.strokeText(label, 0, 0);
ctx.fillStyle = pal.floatFill;
ctx.fillText(label, 0, 0);
ctx.restore();
}

// render ukraine oblast contour map
// skips permanent names until guessed
function drawMap(ctx, room, pal, now) {
if (!window.UKRAINE_MAP) {
return;
}
var mapBox = getMapBox(room);
var phase =
room && room.round ? room.round.phase : 'ready';
var list = window.UKRAINE_MAP.countries;
var painted =
(room.round && room.round.painted) || {};
var cq =
room.round && room.round.currentQuestion;
var lang = room.lang === 'en' ? 'en' : 'uk';

if (phase === 'finished') {
ctx.save();
drawRoundRect(
ctx,
mapBox.x - 16,
mapBox.y - 16,
mapBox.w + 32,
mapBox.h + 32,
22
);
ctx.fillStyle = pal.finishMapBg;
ctx.fill();
ctx.strokeStyle = pal.panelBorder;
ctx.lineWidth = 2.5;
ctx.stroke();
ctx.restore();
}

for (var i = 0; i < list.length; i++) {
var c = list[i];
if (painted[c.code]) {
continue;
}
traceCountry(ctx, c, mapBox);
ctx.fillStyle = pal.land;
ctx.fill();
ctx.strokeStyle = pal.border;
ctx.lineWidth = 1.65;
ctx.stroke();
}

for (var j = 0; j < list.length; j++) {
var pc = list[j];
var pInfo = painted[pc.code];
if (!pInfo) {
continue;
}
var isRevealing =
animState.revealCode === pc.code &&
now - animState.revealStartMs <
animState.revealDuration;

if (isRevealing) {
traceCountry(ctx, pc, mapBox);
ctx.fillStyle = pal.land;
ctx.fill();
ctx.strokeStyle = pal.border;
ctx.lineWidth = 1.65;
ctx.stroke();

var t =
(now - animState.revealStartMs) /
animState.revealDuration;
var cx = projX(pc.cx, mapBox);
var cy = projY(pc.cy, mapBox);
var rad = 360 * t;
ctx.save();
traceCountry(ctx, pc, mapBox);
ctx.clip();
ctx.fillStyle = pInfo.color;
ctx.beginPath();
ctx.arc(cx, cy, rad, 0, Math.PI * 2);
ctx.fill();
ctx.restore();
} else {
traceCountry(ctx, pc, mapBox);
ctx.fillStyle = pInfo.color;
ctx.fill();
}
traceCountry(ctx, pc, mapBox);
ctx.strokeStyle = pal.paintedBorder;
ctx.lineWidth = 2.2;
ctx.stroke();
}

if (
cq &&
cq.guessedCodes &&
phase === 'asking'
) {
for (
var g = 0;
g < cq.guessedCodes.length;
g++
) {
var gCode = cq.guessedCodes[g];
var gc = findMapCountry(gCode);
if (!gc) continue;
var gx = projX(gc.cx, mapBox);
var gy = projY(gc.cy, mapBox);
ctx.save();
ctx.fillStyle = 'rgba(216,30,5,0.40)';
traceCountry(ctx, gc, mapBox);
ctx.fill();
ctx.strokeStyle = '#b91604';
ctx.lineWidth = 2;
ctx.stroke();
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 16px sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('✕ ' + gc.code, gx, gy);
ctx.restore();
}
}

if (
animState.hintCode &&
now - animState.hintStartMs <
animState.hintDuration
) {
var hc = findMapCountry(animState.hintCode);
if (hc) {
var hx = projX(hc.cx, mapBox);
var hy = projY(hc.cy, mapBox);
var ht =
((now - animState.hintStartMs) % 1000) /
1000;
var ringCol =
animState.hintTier === 'neighbor'
? '#15803d'
: animState.hintTier === 'close'
? '#d97706'
: '#1d4ed8';
ctx.save();
ctx.strokeStyle = ringCol;
ctx.lineWidth = 4.5;
ctx.globalAlpha = 1 - ht;
ctx.beginPath();
ctx.arc(
hx,
hy,
16 + ht * 64,
0,
Math.PI * 2
);
ctx.stroke();
ctx.restore();
}
}

drawFloatingRevealLabel(
ctx,
mapBox,
pal,
lang,
now
);
}

// compute scoreboard height below card
// uses two columns when more than 2
function getScoreboardMetrics(room) {
var pos = room.scoreboardPos || 'bottom';
if (pos === 'hidden') {
return { visible: false, h: 0 };
}
var teams = room.teams || [];
if (room.gameMode === 'coop') {
return { visible: true, h: 128 };
}
var cols = teams.length > 2 ? 2 : 1;
var rows = Math.max(
1,
Math.ceil(teams.length / cols)
);
var boxH = 54 + rows * 38 + 12;
return { visible: true, h: boxH };
}

// draw scoreboard at bottom of question
// keeps entire europe map unobstructed
function drawScoreboard(
ctx,
room,
pal,
t,
theme,
now,
totalCountries
) {
var phase =
room && room.round ? room.round.phase : 'ready';
if (phase === 'finished') {
return;
}
var pos = room.scoreboardPos || 'bottom';
if (pos === 'hidden') {
return;
}
var met = getScoreboardMetrics(room);
var boxW = 470;
var boxH = met.h;
var x = 36;
var y = 1044 - boxH;

var paintedCount = Object.keys(
(room.round && room.round.painted) || {}
).length;
var maxCount = totalCountries || 25;

ctx.save();
drawCardBox(
ctx,
x,
y,
boxW,
boxH,
16,
pal,
pal.panelBorder,
2.5
);

if (room.gameMode === 'coop') {
ctx.fillStyle = pal.mutedText;
ctx.font = 'bold 16px sans-serif';
ctx.fillText(t.tvCoopTeam, x + 22, y + 34);

ctx.fillStyle = pal.panelText;
ctx.font = 'bold 48px ' + pal.headingFont;
ctx.fillText(
String(room.coopScore || 0),
x + 22,
y + 92
);

ctx.textAlign = 'right';
ctx.fillStyle = pal.mutedText;
ctx.font = 'bold 18px sans-serif';
ctx.fillText(
t.tvPainted + ':',
x + boxW - 22,
y + 42
);
ctx.fillStyle = pal.accent;
ctx.font = 'bold 34px ' + pal.headingFont;
ctx.fillText(
paintedCount + ' / ' + maxCount,
x + boxW - 22,
y + 88
);
ctx.textAlign = 'left';
ctx.restore();
if (theme === 'christmas') {
drawScoreboardGarland(ctx, x, y, boxW, now);
} else if (theme === 'pub') {
drawPubScoreCrest(ctx, x, y, boxW);
}
return;
}

var teams = room.teams || [];
var cols = teams.length > 2 ? 2 : 1;
var cellW =
cols === 2 ? (boxW - 36) / 2 : boxW - 28;
var rowH = 38;
var headerH = 54;

ctx.fillStyle = pal.panelText;
ctx.font = 'bold 19px ' + pal.headingFont;
var rTitle = room.name || '';
if (rTitle.length > 22) {
rTitle = rTitle.slice(0, 21) + '…';
}
ctx.fillText(rTitle, x + 20, y + 33);

ctx.textAlign = 'right';
ctx.fillStyle = pal.mutedText;
ctx.font = 'bold 16px sans-serif';
ctx.fillText(
t.tvPainted +
': ' +
paintedCount +
'/' +
maxCount,
x + boxW - 20,
y + 33
);
ctx.textAlign = 'left';

var activeId =
room.round && room.round.activeTeamId;
for (var i = 0; i < teams.length; i++) {
var tm = teams[i];
var isAct = tm.id === activeId;
var colIdx = cols === 2 ? i % 2 : 0;
var rowIdx =
cols === 2 ? Math.floor(i / 2) : i;
var cx = x + 14 + colIdx * (cellW + 8);
var ry = y + headerH + rowIdx * rowH;

if (isAct) {
drawRoundRect(
ctx,
cx,
ry,
cellW,
34,
8
);
ctx.fillStyle = pal.activeRowBg;
ctx.fill();
ctx.strokeStyle = tm.color;
ctx.lineWidth = 2.5;
ctx.stroke();
}
if (isAct) {
ctx.fillStyle = tm.color;
ctx.beginPath();
ctx.moveTo(cx + 7, ry + 11);
ctx.lineTo(cx + 15, ry + 17);
ctx.lineTo(cx + 7, ry + 23);
ctx.closePath();
ctx.fill();
}
ctx.fillStyle = tm.color;
ctx.beginPath();
ctx.arc(
cx + (isAct ? 24 : 16),
ry + 17,
7,
0,
Math.PI * 2
);
ctx.fill();

ctx.fillStyle = pal.panelText;
ctx.font = isAct
? 'bold 18px sans-serif'
: 'bold 17px sans-serif';
var nm = tm.name;
var maxLen = cols === 2 ? 9 : 20;
if (nm.length > maxLen) {
nm = nm.slice(0, maxLen - 1) + '…';
}
ctx.fillText(
nm,
cx + (isAct ? 36 : 29),
ry + 23
);

ctx.textAlign = 'right';
ctx.fillStyle = pal.accent;
ctx.font = 'bold 20px sans-serif';
ctx.fillText(
String(tm.score),
cx + cellW - 10,
ry + 23
);
ctx.textAlign = 'left';
}
ctx.restore();

if (theme === 'christmas') {
drawScoreboardGarland(ctx, x, y, boxW, now);
} else if (theme === 'pub') {
drawPubScoreCrest(ctx, x, y, boxW);
}
}

// draw left column riddle above score
// sizes cleanly to sit over scoreboard
function drawLeftPanel(
ctx,
room,
pal,
t,
now,
totalCountries
) {
var round = room.round || {};
var phase = round.phase || 'ready';
if (phase === 'finished') {
return;
}
var cq = round.currentQuestion;
var lang = room.lang === 'en' ? 'en' : 'uk';
var met = getScoreboardMetrics(room);

var cardX = 36;
var cardW = 470;
var topY = 64;
var botY = met.visible
? 1044 - met.h - 20
: 1044;
var cardH = Math.max(300, botY - topY);

if (phase === 'exhausted') {
ctx.save();
var exY = Math.max(topY, botY - 400);
var exH = botY - exY;
drawCardBox(
ctx,
cardX,
exY,
cardW,
exH,
22,
pal,
pal.accent,
3.5
);

ctx.fillStyle = pal.accent;
ctx.font = 'bold 34px ' + pal.headingFont;
var exT = wrapText(
ctx,
t.tvExhaustedTitle,
cardW - 56
);
var ey = exY + 84;
for (var et = 0; et < exT.length; et++) {
ctx.fillText(exT[et], cardX + 28, ey);
ey += 44;
}

ctx.fillStyle = pal.panelText;
ctx.font = 'bold 26px sans-serif';
var exS = wrapText(
ctx,
t.tvExhaustedSub,
cardW - 56
);
ey += 18;
for (var es = 0; es < exS.length; es++) {
ctx.fillText(exS[es], cardX + 28, ey);
ey += 36;
}

var pcCount = Object.keys(
round.painted || {}
).length;
ctx.fillStyle = pal.mutedText;
ctx.font = 'bold 24px sans-serif';
ctx.fillText(
t.tvPainted +
': ' +
pcCount +
' / ' +
(totalCountries || 25),
cardX + 28,
exY + exH - 42
);
ctx.restore();
return;
}

if (phase === 'ready' || !cq) {
ctx.save();
var rY = Math.max(topY, botY - 380);
var rH = botY - rY;
drawCardBox(
ctx,
cardX,
rY,
cardW,
rH,
22,
pal,
pal.panelBorder,
3
);

ctx.fillStyle = pal.accent;
ctx.font = 'bold 24px ' + pal.headingFont;
ctx.fillText(
room.name || t.gameTitle,
cardX + 28,
rY + 56
);

ctx.fillStyle = pal.panelText;
ctx.font = 'bold 34px ' + pal.headingFont;
var readyMsg =
'Готові! Ведучий обирає наступне питання про Україну...';
var rLines = wrapText(ctx, readyMsg, cardW - 56);
for (var rl = 0; rl < rLines.length; rl++) {
ctx.fillText(
rLines[rl],
cardX + 28,
rY + 128 + rl * 46
);
}
ctx.restore();
return;
}

ctx.save();
drawCardBox(
ctx,
cardX,
topY,
cardW,
cardH,
22,
pal,
phase === 'revealed'
? pal.revealColor
: pal.panelBorder,
3.5
);

ctx.fillStyle = pal.badgeBg;
drawRoundRect(
ctx,
cardX + 24,
topY + 22,
172,
44,
10
);
ctx.fill();
ctx.fillStyle = pal.badgeText;
ctx.font = 'bold 22px sans-serif';
ctx.fillText(
'#' + cq.number,
cardX + 42,
topY + 51
);

var ptsText = String(cq.currentValue) + ' PTS';
if (cq.isHalfValue) {
ptsText += ' (½)';
}
ctx.fillStyle = cq.isHalfValue
? pal.ptsHalfBg
: pal.ptsFullBg;
drawRoundRect(
ctx,
cardX + 210,
topY + 22,
cq.isHalfValue ? 236 : 168,
44,
10
);
ctx.fill();
ctx.fillStyle = '#ffffff';
ctx.fillText(ptsText, cardX + 228, topY + 51);

var contentY = topY + 102;
if (
room.gameMode === 'teams' ||
room.gameMode === 'duel'
) {
var tm = null;
for (var k = 0; k < room.teams.length; k++) {
if (room.teams[k].id === round.activeTeamId) {
tm = room.teams[k];
break;
}
}
if (tm) {
ctx.fillStyle = tm.color;
ctx.beginPath();
ctx.arc(
cardX + 36,
contentY - 6,
10,
0,
Math.PI * 2
);
ctx.fill();
ctx.strokeStyle = pal.panelBorder;
ctx.lineWidth = 1.5;
ctx.stroke();
ctx.fillStyle = pal.panelText;
ctx.font = 'bold 24px sans-serif';
ctx.fillText(
tm.name,
cardX + 56,
contentY + 2
);
contentY += 46;
}
}

if (phase === 'revealed') {
var cObj = findMapCountry(cq.country);
var cName = cObj
? lang === 'en'
? cObj.en
: cObj.uk
: cq.country;
var cap = cObj
? lang === 'en'
? cObj.capEn
: cObj.capUk
: '';
ctx.fillStyle = pal.revealColor;
ctx.font = 'bold 34px ' + pal.headingFont;
var cLines = wrapText(
ctx,
cName + (cap ? ' — ' + cap : ''),
cardW - 52
);
for (var cl = 0; cl < cLines.length; cl++) {
ctx.fillText(cLines[cl], cardX + 26, contentY);
contentY += 44;
}
contentY += 12;

ctx.fillStyle = pal.panelText;
ctx.font = '28px sans-serif';
var ansLines = wrapText(
ctx,
cq.answerText,
cardW - 52
);
for (var a = 0; a < ansLines.length; a++) {
if (contentY > botY - 24) break;
ctx.fillText(
ansLines[a],
cardX + 26,
contentY
);
contentY += 38;
}
ctx.restore();
return;
}

if (!room.showQuestionOnTv) {
ctx.textAlign = 'center';
ctx.fillStyle = pal.panelText;
ctx.font = 'bold 36px ' + pal.headingFont;
var listenLines = wrapText(
ctx,
t.tvListenHost,
cardW - 56
);
var ly = topY + Math.floor(cardH * 0.48);
for (var li = 0; li < listenLines.length; li++) {
ctx.fillText(
listenLines[li],
cardX + cardW / 2,
ly + li * 48
);
}
ctx.textAlign = 'left';
} else {
ctx.fillStyle = pal.panelText;
ctx.font = 'bold 33px sans-serif';
var p1Lines = wrapText(
ctx,
cq.part1,
cardW - 52
);
var maxP1Y = cq.part2Revealed
? botY - 210
: botY - 28;
for (var l1 = 0; l1 < p1Lines.length; l1++) {
if (contentY > maxP1Y) break;
ctx.fillText(
p1Lines[l1],
cardX + 26,
contentY
);
contentY += 43;
}

if (cq.part2Revealed && cq.part2) {
contentY += 12;
ctx.font = 'bold 26px sans-serif';
var p2Lines = wrapText(
ctx,
'+ ' + cq.part2,
cardW - 76
);
var p2BoxH = Math.min(
botY - contentY - 18,
28 + p2Lines.length * 34
);
drawRoundRect(
ctx,
cardX + 22,
contentY - 12,
cardW - 44,
Math.max(76, p2BoxH),
12
);
ctx.fillStyle = pal.part2Bg;
ctx.fill();
ctx.strokeStyle = pal.part2Border;
ctx.lineWidth = 2.5;
ctx.stroke();

ctx.fillStyle = pal.panelText;
var p2y = contentY + 22;
for (var l2 = 0; l2 < p2Lines.length; l2++) {
if (p2y > botY - 24) break;
ctx.fillText(
p2Lines[l2],
cardX + 38,
p2y
);
p2y += 34;
}
}
}

if (
cq.lastHint &&
now - animState.hintStartMs <
animState.hintDuration
) {
drawHintToast(
ctx,
cq.lastHint,
t,
lang
);
}
ctx.restore();
}

// draw distance hint banner over top sea
// shows guessed country and proximity
function drawHintToast(ctx, hint, t, lang) {
var textTier =
hint.tier === 'neighbor'
? t.hintNeighbor
: hint.tier === 'close'
? t.hintClose
: t.hintFar;
var bg =
hint.tier === 'neighbor'
? '#15803d'
: hint.tier === 'close'
? '#d97706'
: '#1d4ed8';
var label = textTier;
if (hint.guessedCode) {
var gc = findMapCountry(hint.guessedCode);
var gName = gc
? lang === 'en'
? gc.en
: gc.uk
: hint.guessedCode;
label = gName + ' → ' + textTier;
}
ctx.save();
drawRoundRect(ctx, 640, 26, 1080, 66, 16);
ctx.fillStyle = bg;
ctx.fill();
ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 3;
ctx.stroke();

ctx.textAlign = 'center';
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 28px sans-serif';
ctx.fillText(label, 1180, 69);
ctx.restore();
}

// draw side podium keeping painted map
// shows final scores left of full map
function drawFinishPanel(
ctx,
room,
pal,
t,
totalCountries
) {
var px = 36;
var py = 54;
var pw = 562;
var ph = 936;
var paintedCount = Object.keys(
(room.round && room.round.painted) || {}
).length;

ctx.save();
drawCardBox(
ctx,
px,
py,
pw,
ph,
24,
pal,
pal.panelBorder,
4
);

ctx.textAlign = 'center';
ctx.fillStyle = pal.accent;
ctx.font = 'bold 40px ' + pal.headingFont;
ctx.fillText(t.tvFinishTitle, px + pw / 2, py + 72);

ctx.fillStyle = pal.mutedText;
ctx.font = 'bold 22px sans-serif';
ctx.fillText(
t.tvPainted +
': ' +
paintedCount +
' / ' +
(totalCountries || 25),
px + pw / 2,
py + 114
);

if (
room.gameMode === 'teams' ||
room.gameMode === 'duel'
) {
var sorted = (room.teams || []).slice().sort(
function (a, b) {
return b.score - a.score;
}
);
for (
var i = 0;
i < Math.min(8, sorted.length);
i++
) {
var tm = sorted[i];
var ry = py + 150 + i * 94;
drawRoundRect(
ctx,
px + 28,
ry,
pw - 56,
78,
14
);
ctx.fillStyle =
i === 0
? 'rgba(181,139,66,0.22)'
: pal.activeRowBg;
ctx.fill();
ctx.strokeStyle = tm.color;
ctx.lineWidth = 3;
ctx.stroke();

ctx.textAlign = 'left';
ctx.fillStyle = pal.panelText;
ctx.font = 'bold 28px sans-serif';
var tNm = tm.name;
if (tNm.length > 14) {
tNm = tNm.slice(0, 13) + '…';
}
ctx.fillText(
'#' + (i + 1) + ' ' + tNm,
px + 48,
ry + 49
);

ctx.textAlign = 'right';
ctx.fillStyle = pal.accent;
ctx.font = 'bold 28px sans-serif';
ctx.fillText(
tm.score + ' pts (' + tm.countries + ')',
px + pw - 48,
ry + 49
);
}
} else {
ctx.fillStyle = pal.panelText;
ctx.font = 'bold 68px ' + pal.headingFont;
ctx.fillText(
room.coopScore + ' PTS',
px + pw / 2,
py + 216
);
ctx.fillStyle = pal.mutedText;
ctx.font = 'bold 26px sans-serif';
ctx.fillText(
t.tvLeaderboard,
px + pw / 2,
py + 292
);
var lb = room.leaderboard || [];
for (
var k = 0;
k < Math.min(7, lb.length);
k++
) {
var entry = lb[k];
var ly = py + 324 + k * 82;
drawRoundRect(
ctx,
px + 28,
ly,
pw - 56,
66,
12
);
ctx.fillStyle = pal.activeRowBg;
ctx.fill();
ctx.textAlign = 'left';
ctx.fillStyle = pal.panelText;
ctx.font = 'bold 24px sans-serif';
ctx.fillText(
'#' + (k + 1) + ' ' + entry.label,
px + 48,
ly + 42
);
ctx.textAlign = 'right';
ctx.fillStyle = pal.accent;
ctx.fillText(
entry.score + ' pts',
px + pw - 48,
ly + 42
);
}
}
ctx.restore();
}

// check if tv canvas needs live frames
// saves cpu on static themes when idle
function needsAnimation(state) {
if (!state || !state.room) {
return false;
}
if (state.room.theme === 'christmas') {
return true;
}
var now = Date.now();
if (
animState.revealCode &&
now - animState.revealStartMs <
animState.labelDuration + 120
) {
return true;
}
if (
animState.hintCode &&
now - animState.hintStartMs <
animState.hintDuration + 120
) {
return true;
}
return false;
}

// render complete frame onto tv canvas
// switches layout by current room phase
function render(ctx, state) {
if (!ctx || !state || !state.room) {
return;
}
var room = state.room;
var theme = room.theme || 'standard';
var pal = getThemePalette(theme);
var lang = room.lang === 'en' ? 'en' : 'uk';
var t = window.APP_I18N[lang];
var now = Date.now();
var total = state.totalCountries || 25;

drawBackdrop(ctx, pal, theme, now);
drawMap(ctx, room, pal, now);
drawScoreboard(ctx, room, pal, t, theme, now, total);
drawLeftPanel(ctx, room, pal, t, now, total);

if (
room.round &&
room.round.phase === 'finished'
) {
drawFinishPanel(ctx, room, pal, t, total);
}
}

return {
render: render,
triggerEvent: triggerEvent,
needsAnimation: needsAnimation
};
})();
