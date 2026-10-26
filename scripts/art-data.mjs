// תוכן הפרומפטים לערכות הפתיחה. סדר ההבעות זהה ל-EXPRESSIONS ב-src/lib/starter.ts,
// כך ששם הדיוקן ("01 · שמחה") נשאר נכון.

const EXPR = [
  'genuinely joyful, a bright open smile that reaches the eyes, cheeks lifted',
  'quietly sad, eyes lowered and glistening, the corners of the mouth pulled down',
  'surprised, eyebrows raised high, eyes wide open, lips parted',
  'angry, brows drawn tightly together, jaw clenched, a hard direct stare',
  'deep in thought, gaze turned up and to the side, lips softly pressed',
  'serene and at peace, eyelids relaxed and half lowered, a soft calm mouth',
  'laughing out loud, head tilted slightly back, eyes crinkled almost shut',
  'worried, inner brows raised and knitted, lips pressed thin, anxious eyes',
  'a wry lopsided half smile, one eyebrow slightly raised, skeptical eyes',
  'exhausted, heavy eyelids, dark circles under the eyes, a slack weary mouth',
];

const AGES = ['an 8 year old', 'a 15 year old', 'a 24 year old', 'a 33 year old', 'a 41 year old', 'a 52 year old', 'a 63 year old', 'a 74 year old', 'an 86 year old'];
const ORIGINS = ['Ethiopian', 'Moroccan', 'Eastern European', 'Arab', 'Japanese', 'Indian', 'Nigerian', 'Scandinavian', 'Mexican', 'Persian', 'Yemenite', 'Korean', 'Brazilian', 'Irish', 'Filipino', 'Georgian', 'Senegalese'];
const MALE = ['short trimmed beard', 'round tortoiseshell glasses', 'shaved head', 'thick curly hair', 'grey stubble', 'a wool flat cap', 'a full mustache', 'long hair tied back'];
const FEMALE = ['a soft patterned headscarf', 'long braids', 'round wire glasses', 'a short pixie cut', 'voluminous curly hair', 'grey hair in a low bun', 'small gold hoop earrings', 'wavy shoulder-length hair'];
const YOUNG = ['messy short hair', 'a gap-toothed look', 'freckles across the nose', 'a knitted beanie', 'tousled curls', 'hair in two puffs'];
const CLOTHES = ['a deep ochre linen shirt', 'a muted teal sweater', 'a rust-red scarf', 'an indigo work jacket', 'a cream knit cardigan', 'a dusty rose blouse', 'a charcoal coat with a mustard collar', 'an olive green shirt'];

/** דיוקן מספר i (0 עד 59): גיל, מוצא, מגדר ופרט מזהה מתחלפים, וההבעה לפי הסדר הקבוע */
export function facePrompt(i) {
  const age = AGES[(i * 7) % AGES.length];
  const female = i % 2 === 1;
  const young = age === 'an 8 year old' || age === 'a 15 year old';
  const who = young ? (female ? 'girl' : 'boy') : female ? 'woman' : 'man';
  const origin = ORIGINS[(i * 5) % ORIGINS.length];
  const detail = young ? YOUNG[i % YOUNG.length] : (female ? FEMALE : MALE)[Math.floor(i / 2) % 8];
  const cloth = CLOTHES[(i * 3) % CLOTHES.length];
  return `Portrait of ${age} ${origin} ${who} with ${detail}, wearing ${cloth}, ${EXPR[i % 10]}`;
}

export const FACE_STYLE =
  'Contemporary fine-art portrait painting in oil on linen, confident painterly brushwork, soft blended skin with visible canvas grain, head and shoulders, the face fills most of the frame and sits slightly above center, eye level, sculpted chiaroscuro from a soft window light at 45 degrees, luminous detailed eyes with clear iris texture and fine lashes, full natural lips, warm muted stone-grey studio background with subtle mottled texture, harmonious earthy palette, museum quality, one coherent series. No text, No words, No writing, No frame, No border';

/** סצנה אדריכלית לכל מילה, באותו סדר כמו COACH_WORDS ב-src/lib/coach.ts */
export const COACH_SCENES = [
  'A half-open heavy timber door in a whitewashed stone wall, revealing a sunlit courtyard with a lemon tree beyond', // אפשרות
  'A long raw concrete underpass seen from inside, opening at its far end into bright daylight', // מעבר
  'A modernist glass pavilion with every wall slid open to a wild meadow, sheer curtains lifting in the breeze', // פתיחות
  'A single worn limestone step leading up from a shaded alley into a sunlit lane', // צעד
  'A slender steel footbridge joining two old stone buildings high across a narrow street', // חיבור
  'A rooftop terrace with a low parapet looking out to a wide calm sea horizon at dawn', // אופק
  'Massive fig tree roots growing over and through an ancient dry stone wall', // שורשים
  'A long winding stone staircase climbing through a hillside village and vanishing around a bend', // מסע
  'A white spiral staircase seen from below inside a tower, daylight pouring down from the top', // עלייה
  'A monumental arched gate in an old city wall framing the bright street beyond', // שער
  'A shaded stone bench in a quiet cloister, late afternoon light resting on the worn floor', // מנוחה
  'A bare concrete room with a single sharp shaft of sunlight falling to the floor', // אמת
  'A low dry stone wall dividing two fields, one wild with flowers and one neatly ploughed', // גבולות
  'A narrow gap between two tall buildings revealing a sliver of golden sunset sky', // הזדמנות
  'An empty white room with a wide open window and a single sheet of paper drifting out into the light', // ויתור
  'A minimalist white courtyard with a perfectly still reflecting pool mirroring a clear sky', // בהירות
  'An old olive tree in a stone courtyard, long slow shadows of late afternoon', // סבלנות
  'A long arcade with rhythmic columns, a blurred cyclist passing through bands of light and shade', // תנועה
  'A cantilevered concrete balcony projecting boldly over a deep green valley', // איזון
  'A fork in a stone path in an old town, one way bright with sun and one in deep shade', // החלטה
  'A small deep window in a thick stone wall framing a distant city, seen from inside the dim room', // נקודת מבט
  'A vast empty hall with tall windows and a polished concrete floor glowing in soft light', // מרחב
  'A weathered sundial on an old limestone facade casting a crisp shadow', // זמן
  'A skylight throwing a bright square of sun onto a rough plaster wall', // אור
  'The lattice shadow of a pergola spread across a white wall and floor at noon', // צל
  'A long enfilade of open doorways in an old house receding into the distance', // עומק
  'White linen curtains billowing into a breezy seaside room', // קלילות
  'An old iron handrail worn smooth beside a steep stone stair', // אחיזה
  'A courtyard fountain throwing water into the air, sunlit droplets suspended', // שחרור
  'A straight tree-lined path leading toward a distant arched doorway', // כיוון
  'A small city square where several narrow lanes converge around an old stone well', // מפגש
  'An amphitheater of stone steps facing an empty stage in quiet morning light', // קשב
  'A stair inside a roofless ruin rising toward open sky, clouds framed by broken walls', // דמיון
  'A single warmly lit window in a dark facade at blue hour', // כוונה
  'A vaulted underground cistern full of still clear water, light entering from above', // משאב
  'Massive stone buttresses holding up an old church wall', // תמיכה
  'A narrow cliffside walkway hugging a sheer rock face high above the sea', // תעוזה
  'A dim corridor ending in a closed door with light leaking from underneath', // ספקנות
  'An empty train platform at dawn, the tracks curving away into mist', // ציפייה
  'Fresh green vines and new leaves spreading across a restored concrete facade', // התחדשות
  'A single wooden chair in a whitewashed room with one small window', // פשטות
  'An intricate web of stairs, bridges and balconies in a dense old market quarter', // מורכבות
  'The massive stone foundation blocks of an ancient building at ground level', // יציבות
  'A clear stream running through a carved stone channel in a walled garden', // זרימה
  'A small vaulted room with a single candle niche glowing in warm light', // משמעות
  'A wall of worn leather books in a quiet stone library room, spines without lettering', // ערכים
  'A tall slit window in a dark tower revealing a bright open landscape', // חזון
  'A heavy rope tied firmly around a stone bollard at an old harbor', // מחויבות
  'A sunlit kitchen table with bread and fruit beside an open window to a garden', // הודיה
  'A still courtyard with one tree reflected in a shallow pool at dusk', // שקט פנימי
  'Two old houses joined by a small covered bridge over a lane', // קשר
  'A curved bamboo pavilion bending gracefully over a pond', // גמישות
  'A sunlit old classroom with empty wooden desks and a blank dark board', // למידה
  'A crack in a concrete wall repaired with seams of gold', // טעות
  'A rooftop reached at the top of a long stair, wide panoramic view at golden hour', // הצלחה
  'A dark stairwell descending into shadow with a single bare bulb above', // חשש
  'An old stone well in a courtyard, coins glinting at the bottom', // משאלה
  'A lived-in doorway with potted plants and a worn welcome step', // מקום
  'A freshly cut path through tall grass leading toward a white house', // דרך חדשה
  'An open loggia with wind moving sheer curtains, overlooking soft hills', // נשימה
  'A round oculus in a domed ceiling opening to deep blue sky', // ראייה
  'A single worn armchair in a beam of sunlight in a quiet room', // נוכחות
  "An artist's studio with tall north windows and blank canvases leaning on the wall", // השראה
  'An almond tree in full white bloom inside an old stone courtyard', // פריחה
  'Three stairways meeting at a crossroads in a hillside town under open sky', // בחירה חופשית
];

export const COACH_STYLE =
  'Documentary realism, Professional architecture photography, natural light, rich texture of stone, concrete, wood and plaster, quiet poetic atmosphere, strong composition with leading lines, no people. No text, No words, No writing, No frame divisions';
