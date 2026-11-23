// ukraine 25 regions and border graph
// powers distance hints and bonuses
var COUNTRIES = {
CK: {
code: 'CK',
uk: 'Черкаська область',
en: 'Cherkasy Oblast',
capUk: 'Черкаси',
capEn: 'Cherkasy',
cx: 162.8,
cy: 84.4,
neighbors: ['KV','PL','KR','VN']
},
CN: {
code: 'CN',
uk: 'Чернігівська область',
en: 'Chernihiv Oblast',
capUk: 'Чернігів',
capEn: 'Chernihiv',
cx: 173.7,
cy: 31.8,
neighbors: ['KV','PL','SM']
},
CR: {
code: 'CR',
uk: 'АР Крим',
en: 'Crimea',
capUk: 'Сімферополь',
capEn: 'Simferopol',
cx: 214.3,
cy: 184.8,
neighbors: ['KS']
},
CV: {
code: 'CV',
uk: 'Чернівецька область',
en: 'Chernivtsi Oblast',
capUk: 'Чернівці',
capEn: 'Chernivtsi',
cx: 72.9,
cy: 109.3,
neighbors: ['IF','TP','KM','VN']
},
DN: {
code: 'DN',
uk: 'Донецька область',
en: 'Donetsk Oblast',
capUk: 'Донецьк',
capEn: 'Donetsk',
cx: 268.6,
cy: 117.2,
neighbors: ['LG','KH','DP','ZP']
},
DP: {
code: 'DP',
uk: 'Дніпропетровська область',
en: 'Dnipropetrovsk Oblast',
capUk: 'Дніпро',
capEn: 'Dnipro',
cx: 221.2,
cy: 108.5,
neighbors: ['PL','KH','DN','ZP','KS','MK','KR']
},
IF: {
code: 'IF',
uk: 'Івано-Франківська область',
en: 'Ivano-Frankivsk Oblast',
capUk: 'Івано-Франківськ',
capEn: 'Ivano-Frankivsk',
cx: 50.2,
cy: 98.5,
neighbors: ['LV','TP','CV','ZK']
},
KH: {
code: 'KH',
uk: 'Харківська область',
en: 'Kharkiv Oblast',
capUk: 'Харків',
capEn: 'Kharkiv',
cx: 249,
cy: 75.5,
neighbors: ['SM','PL','DP','DN','LG']
},
KM: {
code: 'KM',
uk: 'Хмельницька область',
en: 'Khmelnytskyi Oblast',
capUk: 'Хмельницький',
capEn: 'Khmelnytskyi',
cx: 88.8,
cy: 78.2,
neighbors: ['RV','ZT','VN','CV','TP']
},
KR: {
code: 'KR',
uk: 'Кіровоградська область',
en: 'Kirovohrad Oblast',
capUk: 'Кропивницький',
capEn: 'Kropyvnytskyi',
cx: 175,
cy: 104.2,
neighbors: ['CK','PL','DP','MK','OD','VN']
},
KS: {
code: 'KS',
uk: 'Херсонська область',
en: 'Kherson Oblast',
capUk: 'Херсон',
capEn: 'Kherson',
cx: 198.2,
cy: 152.5,
neighbors: ['MK','DP','ZP','CR']
},
KV: {
code: 'KV',
uk: 'Київська область',
en: 'Kyiv Oblast',
capUk: 'Київ',
capEn: 'Kyiv',
cx: 147.9,
cy: 58.2,
neighbors: ['ZT','VN','CK','PL','CN']
},
LG: {
code: 'LG',
uk: 'Луганська область',
en: 'Luhansk Oblast',
capUk: 'Луганськ',
capEn: 'Luhansk',
cx: 291.1,
cy: 91.3,
neighbors: ['KH','DN']
},
LV: {
code: 'LV',
uk: 'Львівська область',
en: 'Lviv Oblast',
capUk: 'Львів',
capEn: 'Lviv',
cx: 38.5,
cy: 72.9,
neighbors: ['VL','RV','TP','IF','ZK']
},
MK: {
code: 'MK',
uk: 'Миколаївська область',
en: 'Mykolaiv Oblast',
capUk: 'Миколаїв',
capEn: 'Mykolaiv',
cx: 169.8,
cy: 131.3,
neighbors: ['OD','KR','DP','KS']
},
OD: {
code: 'OD',
uk: 'Одеська область',
en: 'Odesa Oblast',
capUk: 'Одеса',
capEn: 'Odesa',
cx: 139.2,
cy: 151.7,
neighbors: ['VN','KR','MK']
},
PL: {
code: 'PL',
uk: 'Полтавська область',
en: 'Poltava Oblast',
capUk: 'Полтава',
capEn: 'Poltava',
cx: 203.4,
cy: 72.5,
neighbors: ['CN','SM','KH','DP','KR','CK','KV']
},
RV: {
code: 'RV',
uk: 'Рівненська область',
en: 'Rivne Oblast',
capUk: 'Рівне',
capEn: 'Rivne',
cx: 79.9,
cy: 39.7,
neighbors: ['VL','LV','TP','KM','ZT']
},
SM: {
code: 'SM',
uk: 'Сумська область',
en: 'Sumy Oblast',
capUk: 'Суми',
capEn: 'Sumy',
cx: 209.2,
cy: 38,
neighbors: ['CN','PL','KH']
},
TP: {
code: 'TP',
uk: 'Тернопільська область',
en: 'Ternopil Oblast',
capUk: 'Тернопіль',
capEn: 'Ternopil',
cx: 67.4,
cy: 80.9,
neighbors: ['RV','KM','CV','IF','LV']
},
VL: {
code: 'VL',
uk: 'Волинська область',
en: 'Volyn Oblast',
capUk: 'Луцьк',
capEn: 'Lutsk',
cx: 54.4,
cy: 35.9,
neighbors: ['RV','LV']
},
VN: {
code: 'VN',
uk: 'Вінницька область',
en: 'Vinnytsia Oblast',
capUk: 'Вінниця',
capEn: 'Vinnytsia',
cx: 118.2,
cy: 92.9,
neighbors: ['ZT','KV','CK','KR','OD','CV','KM']
},
ZK: {
code: 'ZK',
uk: 'Закарпатська область',
en: 'Zakarpattia Oblast',
capUk: 'Ужгород',
capEn: 'Uzhhorod',
cx: 27.8,
cy: 105.9,
neighbors: ['LV','IF']
},
ZP: {
code: 'ZP',
uk: 'Запорізька область',
en: 'Zaporizhzhia Oblast',
capUk: 'Запоріжжя',
capEn: 'Zaporizhzhia',
cx: 236.8,
cy: 137,
neighbors: ['DP','DN','KS']
},
ZT: {
code: 'ZT',
uk: 'Житомирська область',
en: 'Zhytomyr Oblast',
capUk: 'Житомир',
capEn: 'Zhytomyr',
cx: 114.7,
cy: 49.7,
neighbors: ['RV','KM','VN','KV']
}
};

// get region metadata by 2-letter code
// returns null when code is unknown
function getCountry(code) {
if (!code) return null;
return COUNTRIES[code.toUpperCase()] || null;
}

// check if two regions share a border
// reads static symmetric neighbor list
function isNeighbor(codeA, codeB) {
var a = getCountry(codeA);
var b = getCountry(codeB);
if (!a || !b) return false;
return a.neighbors.indexOf(b.code) !== -1;
}

// compute distance tier between guesses
// returns exact, neighbor, close, or far
function getDistanceHint(guess, target) {
var g = getCountry(guess);
var t = getCountry(target);
if (!g || !t) return 'far';
if (g.code === t.code) return 'exact';
if (isNeighbor(g.code, t.code)) return 'neighbor';
var dx = g.cx - t.cx;
var dy = g.cy - t.cy;
var dist = Math.sqrt(dx * dx + dy * dy);
if (dist <= 76) return 'close';
return 'far';
}

// return sorted list of all 25 regions
// sorted by ukrainian name for host ui
function listCountries() {
var out = [];
for (var k in COUNTRIES) {
if (COUNTRIES.hasOwnProperty(k)) {
out.push(COUNTRIES[k]);
}
}
out.sort(function (a, b) {
return a.uk.localeCompare(b.uk, 'uk');
});
return out;
}

module.exports = {
COUNTRIES: COUNTRIES,
getCountry: getCountry,
isNeighbor: isNeighbor,
getDistanceHint: getDistanceHint,
listCountries: listCountries
};
