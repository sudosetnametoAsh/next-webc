// Helper function to expand course abbreviations
export function expandCourseAbbreviation(abbreviation: string): string {

  const shortNames: Record<string, string> = {

    // ———— Information & Communications Technology —————————————————————————————

    'BSIT': 'Bachelor of Science in Information Technology',
    'BSCS': 'Bachelor of Science in Computer Science',
    'BSIS': 'Bachelor of Science in Information Systems',
    'IT': '2-yr. Information Technology',
    'ACT': '2-yr. Associate in Computer Technology',

    // ———— Business & Management —————————————————————————————

    'BSBA': 'Bachelor of Science in Business Administration',
    'BSA': 'Bachelor of Science in Accountancy',
    'BSAIS': 'Bachelor of Science in Accounting Information System',
    'BSMA': 'Bachelor of Science in Management Accounting',
    'BSRTCS': 'Bachelor of Science in Retail Technology and Consumer Service',
    'ART': '2-yr. Associate in Retail Technology',

    // ———— Hospitality Management —————————————————————————————

    'BSHM': 'Bachelor of Science in Hospitality Management',
    'BSCM': 'Bachelor of Science in Culinary Management',
    'HRA': '3-yr. Hotel and Restaurant Administration',
    'HRS': '2-yr. Hospitality and Restaurant Services',

    // ———— Tourism Management —————————————————————————————

    'BSTM': 'Bachelor of Science in Tourism Management',

    // ———— Engineering —————————————————————————————

    'BSCPE': 'Bachelor of Science in Computer Engineering',

    // ———— Arts & Sciences —————————————————————————————

    'Bachelor of Arts in Psychology': 'Bachelor of Arts in Psychology',
    'BMMA': 'Bachelor of Multimedia Arts',
    'BACOMM': 'Bachelor of Arts in Communication',

    // ———— Maritime —————————————————————————————

    'BSMT': 'Bachelor of Science in Marine Transportation',
    'BSMarE': 'Bachelor of Science in Marine Engineering',
    'BSNAME': 'Bachelor of Science in Naval Architecture and Marine Engineering',

    // ———— Criminal Justice Education —————————————————————————————

    'BSCrim': 'Bachelor of Science in Criminology',
  }

  return shortNames[abbreviation] || ''
}

// Common collegiate domain abbreviations that use standard 2-4 letter conventions
const ACADEMIC_DOMAIN_ABBREVIATIONS: Record<string, string> = {
  'computer science': 'CS',
  'computer engineering': 'CPE',
  'civil engineering': 'CE',
  'mechanical engineering': 'ME',
  'electrical engineering': 'EE',
  'electronics engineering': 'ECE',
  'marine engineering': 'MarE',
  'naval architecture and marine engineering': 'NAME',
  'marine transportation': 'MT',
  'information technology': 'IT',
  'information systems': 'IS',
  'business administration': 'BA',
  'management accounting': 'MA',
  'hospitality management': 'HM',
  'tourism management': 'TM',
  'culinary management': 'CM',
  'multimedia arts': 'MMA',
  'communication': 'COMM',
  'criminology': 'Crim',
  'accountancy': 'A',
  'accounting information system': 'AIS',
  'accounting information systems': 'AIS',
};

const STOP_WORDS = new Set(['of', 'in', 'and', 'the', 'for', 'to', 'at', 'a', 'an', '&']);

/**
 * Helper function to shrink course names using a dynamic grammatical algorithm.
 * Automatically derives standard acronyms (e.g. BSCS, BSIT, BSCPE, BSDA)
 * from arbitrary course strings without requiring hardcoded course catalogs.
 */
export function shrinkCourseName(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  // 1. If already an uppercase shortcode (e.g. "BSCS", "BSIT", "STAFF"), return as-is
  if (/^[A-Z0-9-]{2,8}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. Staff check
  if (trimmed.toLowerCase().includes('staff')) {
    return 'STAFF';
  }

  // 3. Extract Degree Level Prefix
  const prefixPatterns: { regex: RegExp; prefix: string }[] = [
    { regex: /^(?:2[- ]?yr\.?\s+|3[- ]?yr\.?\s+)?associate\s+(?:in|of)\s+/i, prefix: 'A' },
    { regex: /^bachelor\s+of\s+science\s*(?:in|and)?\s*/i, prefix: 'BS' },
    { regex: /^bachelor\s+of\s+arts\s*(?:in|and)?\s*/i, prefix: 'BA' },
    { regex: /^bachelor\s+of\s+fine\s+arts\s*(?:in|and)?\s*/i, prefix: 'BFA' },
    { regex: /^bachelor\s+of\s*(?:in|and)?\s*/i, prefix: 'B' },
    { regex: /^master\s+of\s+science\s*(?:in|and)?\s*/i, prefix: 'MS' },
    { regex: /^master\s+of\s+arts\s*(?:in|and)?\s*/i, prefix: 'MA' },
    { regex: /^master\s+of\s*(?:in|and)?\s*/i, prefix: 'M' },
    { regex: /^doctor\s+of\s+philosophy\s*(?:in|and)?\s*/i, prefix: 'PhD' },
    { regex: /^doctor\s+of\s*(?:in|and)?\s*/i, prefix: 'D' },
  ];

  let degreePrefix = '';
  let remainder = trimmed;

  for (const p of prefixPatterns) {
    const match = trimmed.match(p.regex);
    if (match) {
      degreePrefix = p.prefix;
      remainder = trimmed.slice(match[0].length).trim();
      break;
    }
  }

  // Clean remainder of punctuation/hyphens/parentheses
  const cleanedRemainder = remainder.replace(/[-_()]/g, ' ').replace(/\s+/g, ' ').trim();
  const remainderLower = cleanedRemainder.toLowerCase();

  // 4. Check known academic domain abbreviations
  if (ACADEMIC_DOMAIN_ABBREVIATIONS[remainderLower]) {
    return `${degreePrefix}${ACADEMIC_DOMAIN_ABBREVIATIONS[remainderLower]}`;
  }

  // 5. Dynamic fallback: extract initial letter of non-stop words
  const words = cleanedRemainder
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w.toLowerCase()));

  if (words.length === 0) {
    return degreePrefix || trimmed.slice(0, 4).toUpperCase();
  }

  const specAcronym = words.map((w) => w[0].toUpperCase()).join('');
  return `${degreePrefix}${specAcronym}`;
}

/** Shared fill color for clearance progress bars across all user roles. */
export function getProgressBarColor(_rate: number): string {
  return 'bg-[#f59e0b]'
}
