// uniform 1920x1080 tv viewport scaler
// fits stage inside any screen with safe box
window.TV_SCALE = (function () {
var STAGE_W = 1920;
var STAGE_H = 1080;
var SAFE = 0.97;
var curScale = 1;

// scale target element uniformly
// centers 16:9 stage inside window
function applyScale(el) {
if (!el) {
return;
}
var vw =
window.innerWidth ||
document.documentElement.clientWidth ||
1920;
var vh =
window.innerHeight ||
document.documentElement.clientHeight ||
1080;
var sx = vw / STAGE_W;
var sy = vh / STAGE_H;
curScale = Math.min(sx, sy);
var tx = Math.round(
(vw - STAGE_W * curScale) / 2
);
var ty = Math.round(
(vh - STAGE_H * curScale) / 2
);
var tf =
'translate(' +
tx +
'px,' +
ty +
'px) scale(' +
curScale +
')';
el.style.width = STAGE_W + 'px';
el.style.height = STAGE_H + 'px';
el.style.transformOrigin = '0 0';
el.style.webkitTransformOrigin = '0 0';
el.style.transform = tf;
el.style.webkitTransform = tf;
}

return {
W: STAGE_W,
H: STAGE_H,
SAFE: SAFE,
applyScale: applyScale,
getScale: function () {
return curScale;
}
};
})();
