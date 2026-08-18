/* Every dog that comes through the lens gets catalogued: a dignified name, an
   age in the double digits, and whatever it is he did before he retired.

   The naming is deterministic — hashed from the clip's own id — so the same dog
   is the same gentleman every time he runs past. Nothing here is ever sad. */

var NAMES = [
  'Bartholomew', 'Winston', 'Reginald', 'Mortimer', 'Cornelius', 'Percival',
  'Ambrose', 'Barnaby', 'Horace', 'Desmond', 'Otis', 'Rufus', 'Clement',
  'Wendell', 'Silas', 'Bertram', 'Archibald', 'Chauncey', 'Herbert', 'Maurice',
  'Ludwig', 'Fitzwilliam', 'Osgood', 'Thaddeus', 'Gus', 'Alfie', 'Humphrey',
  'Roland', 'Ellsworth', 'Rupert', 'Bernard', 'Nigel', 'Merritt', 'Hollis',
  'Agnes', 'Mabel', 'Winnifred', 'Prudence', 'Beatrix', 'Eunice', 'Dorothy',
  'Hazel', 'Edith', 'Josephine', 'Myrtle', 'Cordelia', 'Ottilie', 'Harriet',
  'Constance', 'Wilhelmina', 'Greta', 'Augusta'
];

var TITLES = [
  'retired postmaster',
  'emeritus professor of napping',
  'former harbourmaster',
  'keeper of the good stick',
  'chairman of the ground floor',
  'lifetime member of the Ottoman Society',
  'retired, mostly',
  'custodian of the warm spot',
  'veteran of the vacuum wars',
  'senior fellow in leaf studies',
  'former night watchman, back garden',
  'holder of one (1) excellent bone',
  'retired from the Royal Mail, unofficially',
  'district inspector of smells',
  'ex-lifeguard, kiddie pool',
  'longtime critic of the postman',
  'foreman of the sock recovery unit',
  'honorary lifeguard',
  'professor emeritus, sunbeam physics',
  'retired competitive sitter',
  'undersecretary of dinner',
  'former union rep, tennis ball division',
  'keeper of the third-best blanket',
  'gentleman of leisure',
  'retired mayor of the cul-de-sac',
  'senior consultant, crumb retrieval',
  'former captain of the stairs',
  'lifetime subscriber to the good chair',
  'ex-bailiff of the front window',
  'retired ferry captain, hallway line',
  'archivist of buried things',
  'part-time weather forecaster, joints',
  'grand marshal of the four o\'clock parade',
  'retired locksmith, back door',
  'senior groundskeeper',
  'ex-conductor, midnight zoomie express',
  'longstanding friend of the fridge',
  'retired cartographer of the garden',
  'first violin, dinner-time chorus',
  'former quality inspector, all shoes',
  'sergeant-at-arms, letterbox',
  'esteemed elder of the dog park',
  'retired sommelier, puddles',
  'keeper of the ceremonial tennis ball',
  'emeritus greeter',
  'former chief of the neighbourhood watch',
  'retired stunt double',
  'permanent guest of honour'
];

/* Small flourishes, used about a third of the time — the observatory's own
   notes on what it just saw. */
var NOTES = [
  'still absolutely got it',
  'no notes',
  'observed at full speed',
  'velocity: unreasonable',
  'has decided today is a running day',
  'not slowing down for anyone',
  'brakes optional',
  'currently the fastest thing on this street',
  'nine laps and counting',
  'immediately did it again',
  'was not asked to do this',
  'entirely his own idea',
  'peak form',
  'unbothered, moisturised, in his lane',
  'a full-body yes'
];

function hashString(str) {
  var h = 2166136261;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

/* Pull several independent numbers out of one hash so name, age and title
   don't move together. */
function catalogue(id) {
  var h = hashString(String(id));
  var a = h % 100003;
  var b = Math.floor(h / 7) % 100019;
  var c = Math.floor(h / 53) % 100043;
  var d = Math.floor(h / 911) % 100057;

  var name = NAMES[a % NAMES.length];
  var age = 10 + (b % 8);                      /* ten through seventeen */
  var title = TITLES[c % TITLES.length];
  var note = (d % 3 === 0) ? NOTES[d % NOTES.length] : null;

  return {
    name: name,
    meta: age + ' · ' + title + (note ? ' · ' + note : '')
  };
}
