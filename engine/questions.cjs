// question pack parser, cache, and loader
// reads txt packs with optional part 2
var fs = require('fs');
var path = require('path');
var ukraine = require('./ukraine.cjs');

var BUILTIN_DIR = path.join(
__dirname,
'..',
'data',
'packs'
);
var PACKS_DIR = path.join(
process.env.DATA_DIR ||
path.join(__dirname, '..', 'data'),
'packs'
);

var BUILTIN_FILES = {
'born_history_uk.txt': true,
'born_stars_uk.txt': true,
'facts_uk.txt': true,
'history_uk.txt': true,
'born_writers_uk.txt': true,
'literature_places_uk.txt': true
};

var packCache = {};
var listCache = null;

// clear cached pack data after upload
// forces fresh read on next request
function clearPackCache() {
packCache = {};
listCache = null;
}

// make writable packs directory
// avoids crash on custom pack upload
function makePacksDir() {
if (!fs.existsSync(PACKS_DIR)) {
fs.mkdirSync(PACKS_DIR, {
recursive: true
});
}
}

// find pack file in custom or builtin
// returns full disk path or null
function resolvePackPath(fileName) {
var safeName = path.basename(
String(fileName || 'facts_uk.txt')
);
var customPath = path.join(
PACKS_DIR,
safeName
);
if (fs.existsSync(customPath)) {
return customPath;
}
var builtinPath = path.join(
BUILTIN_DIR,
safeName
);
if (fs.existsSync(builtinPath)) {
return builtinPath;
}
return null;
}

// trim blank lines around text block
// preserves internal line breaks
function trimBlock(lines) {
var start = 0;
var end = lines.length;
while (
start < end &&
lines[start].trim() === ''
) {
start += 1;
}
while (
end > start &&
lines[end - 1].trim() === ''
) {
end -= 1;
}
return lines
.slice(start, end)
.join('\n');
}

// build one question object from lines
// splits part 1, optional part 2, answer
function buildQuestion(num, country, lines) {
var sepAns = lines.indexOf('---');
var bodyLines =
sepAns === -1
? lines
: lines.slice(0, sepAns);
var ansLines =
sepAns === -1
? []
: lines.slice(sepAns + 1);
var sepPart2 = bodyLines.indexOf('+++');
var part1Lines =
sepPart2 === -1
? bodyLines
: bodyLines.slice(0, sepPart2);
var part2Lines =
sepPart2 === -1
? []
: bodyLines.slice(sepPart2 + 1);
var part1 = trimBlock(part1Lines);
var part2 = trimBlock(part2Lines);
var answer = trimBlock(ansLines);
return {
number: num,
country: String(country || '').toUpperCase(),
part1: part1,
part2: part2,
hasPart2: part2.length > 0,
answerText: answer
};
}

// parse raw txt content into questions
// matches #number [CODE] header lines
function parseQuestionsText(raw) {
var lines = String(raw || '').split(/\r?\n/);
var list = [];
var curNum = null;
var curCountry = '';
var curLines = [];
var re = /^#(\d+)\s*\[([A-Za-z]{2})\]\s*$/;
for (var i = 0; i < lines.length; i++) {
var line = lines[i];
var m = re.exec(line.trim());
if (m) {
if (curNum !== null) {
list.push(
buildQuestion(
curNum,
curCountry,
curLines
)
);
}
curNum = parseInt(m[1], 10);
curCountry = m[2].toUpperCase();
curLines = [];
} else if (curNum !== null) {
curLines.push(line);
}
}
if (curNum !== null) {
list.push(
buildQuestion(
curNum,
curCountry,
curLines
)
);
}
return list;
}

// load a single pack file by name
// reads from memory cache when available
function loadPackByFile(fileName) {
var safeName = path.basename(
String(fileName || 'facts_uk.txt')
);
if (packCache[safeName]) {
return packCache[safeName];
}
var fullPath = resolvePackPath(safeName);
if (!fullPath) {
return {
fileName: safeName,
list: []
};
}
var raw = fs.readFileSync(
fullPath,
'utf8'
);
var parsed = {
fileName: safeName,
list: parseQuestionsText(raw)
};
packCache[safeName] = parsed;
return parsed;
}

// validate parsed questions before save
// catches unknown country codes and dupes
function checkPackQuestions(list) {
var seenNum = {};
for (var i = 0; i < list.length; i++) {
var q = list[i];
if (!ukraine.getCountry(q.country)) {
throw new Error(
'Unknown region code [' +
q.country +
'] in #' +
q.number
);
}
if (!q.part1) {
throw new Error(
'Empty question text in #' + q.number
);
}
if (!q.answerText) {
throw new Error(
'Missing --- answer in #' + q.number
);
}
if (seenNum[q.number]) {
throw new Error(
'Duplicate question #' + q.number
);
}
seenNum[q.number] = true;
}
}

// save uploaded custom txt pack to disk
// guards built-in names and checks format
function savePackFile(fileName, rawContent) {
makePacksDir();
var cleanName = path
.basename(String(fileName || 'custom.txt'))
.replace(/[^a-zA-Z0-9._-]/g, '_');
if (!/\.txt$/i.test(cleanName)) {
cleanName += '.txt';
}
if (cleanName.length > 64) {
cleanName = cleanName.slice(0, 60) + '.txt';
}
if (BUILTIN_FILES[cleanName.toLowerCase()]) {
cleanName = 'custom_' + cleanName;
}
var parsed = parseQuestionsText(rawContent);
if (parsed.length === 0) {
throw new Error(
'No valid #N [CC] questions found'
);
}
checkPackQuestions(parsed);
var fullPath = path.join(
PACKS_DIR,
cleanName
);
fs.writeFileSync(
fullPath,
String(rawContent),
'utf8'
);
clearPackCache();
return {
fileName: cleanName,
count: parsed.length
};
}

// list all available txt packs
// uses memory cache to skip disk io
function listAvailablePacks() {
if (listCache) {
return listCache;
}
var labels = {
'facts_uk.txt': {
uk: 'Цікавинки',
en: 'Цікавинки',
category: 'facts',
lang: 'uk'
},
'history_uk.txt': {
uk: 'Загальна історія',
en: 'Загальна історія',
category: 'history',
lang: 'uk'
},
'born_history_uk.txt': {
uk: 'Де народився (історія)',
en: 'Де народився (історія)',
category: 'born_history',
lang: 'uk'
},
'born_stars_uk.txt': {
uk: 'Де народився (зірки)',
en: 'Де народився (зірки)',
category: 'born_stars',
lang: 'uk'
},
'born_writers_uk.txt': {
uk: 'Де народився (письменники)',
en: 'Де народився (письменники)',
category: 'born_writers',
lang: 'uk'
},
'literature_places_uk.txt': {
uk: 'Де відбуваються події (література)',
en: 'Де відбуваються події (література)',
category: 'literature_places',
lang: 'uk'
}
};
var seen = {};
var dirs = [PACKS_DIR, BUILTIN_DIR];
var out = [];
for (var d = 0; d < dirs.length; d++) {
if (!fs.existsSync(dirs[d])) {
continue;
}
var files = fs.readdirSync(dirs[d]);
for (var i = 0; i < files.length; i++) {
var f = files[i];
if (!/\.txt$/i.test(f) || seen[f]) {
continue;
}
seen[f] = true;
var pack = loadPackByFile(f);
var meta = labels[f] || {
uk: f,
en: f,
category: 'custom',
lang: 'uk'
};
out.push({
file: f,
labelUk: meta.uk,
labelEn: meta.en,
category: meta.category,
lang: meta.lang,
count: pack.list.length
});
}
}
var order = [
'facts_uk.txt',
'history_uk.txt',
'born_history_uk.txt',
'born_stars_uk.txt',
'born_writers_uk.txt',
'literature_places_uk.txt'
];
out.sort(function (a, b) {
var ia = order.indexOf(a.file);
var ib = order.indexOf(b.file);
if (ia !== -1 && ib !== -1) {
return ia - ib;
}
if (ia !== -1) return -1;
if (ib !== -1) return 1;
return a.file.localeCompare(b.file);
});
listCache = out;
return out;
}

// build randomized or ordered id queue
// filters out already asked questions
function buildQueue(list, askedNums, isRandom) {
var askedSet = {};
for (var i = 0; i < askedNums.length; i++) {
askedSet[askedNums[i]] = true;
}
var queue = [];
for (var j = 0; j < list.length; j++) {
if (!askedSet[list[j].number]) {
queue.push(list[j].number);
}
}
if (isRandom) {
for (var k = queue.length - 1; k > 0; k--) {
var r = Math.floor(Math.random() * (k + 1));
var tmp = queue[k];
queue[k] = queue[r];
queue[r] = tmp;
}
}
return queue;
}

module.exports = {
parseQuestionsText: parseQuestionsText,
loadPackByFile: loadPackByFile,
resolvePackPath: resolvePackPath,
savePackFile: savePackFile,
listAvailablePacks: listAvailablePacks,
buildQueue: buildQueue,
clearPackCache: clearPackCache
};
