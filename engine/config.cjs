// game rules and theme defaults
// holds scoring and palette values
module.exports = {
BASE_POINTS: 100,
HINT_PENALTY: 20,
MIN_HINT_POINTS: 40,
DOUBLE_PART2_POINTS: 50,
EXTRA_HINT_AFTER_P2: 10,
MIN_FINAL_POINTS: 20,
NEIGHBOR_BONUS: 20,
MAX_EVENTS: 50,
THEMES: [
'standard',
'dark',
'christmas',
'pub'
],
DUEL_TEAMS: [
{
name: 'Жовті',
color: '#eab308'
},
{
name: 'Блакитні',
color: '#0ea5e9'
}
],
TEAM_COLORS: [
'#2563eb',
'#dc2626',
'#059669',
'#9333ea',
'#ea580c',
'#0891b2',
'#db2777',
'#ca8a04'
],
// random non-yellow colors for coop
// skips yellow and amber tones
COOP_COLORS: [
'#2563eb',
'#dc2626',
'#059669',
'#7c3aed',
'#0891b2',
'#db2777',
'#e11d48',
'#4f46e5',
'#0d9488',
'#16a34a',
'#9333ea',
'#0284c7'
],
COLOR_NAMES_UK: {
'#2563eb': 'Синій',
'#dc2626': 'Червоний',
'#059669': 'Зелений',
'#9333ea': 'Фіолетовий',
'#ea580c': 'Помаранчевий',
'#0891b2': 'Бірюзовий',
'#db2777': 'Рожевий',
'#ca8a04': 'Золотий'
},
COLOR_NAMES_EN: {
'#2563eb': 'Blue',
'#dc2626': 'Red',
'#059669': 'Green',
'#9333ea': 'Purple',
'#ea580c': 'Orange',
'#0891b2': 'Cyan',
'#db2777': 'Pink',
'#ca8a04': 'Gold'
}
};
