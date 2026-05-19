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

// Helper function to shrink couse names
export function shrinkCourseName(name: string): string {

  const longNames: Record<string, string> = {

    // ———— Information & Communications Technology —————————————————————————————

    'Bachelor of Science in Information Technology': 'BSIT',
    'Bachelor of Science in Computer Science': 'BSCS',
    'Bachelor of Science in Information Systems': 'BSIS',
    '2-yr. Information Technology': 'IT',
    '2-yr. Associate in Computer Technology': 'ACT',

    // ———— Business & Management —————————————————————————————
    
    'Bachelor of Science in Business Administration': 'BSBA',
    'Bachelor of Science in Accountancy': 'BSA',
    'Bachelor of Science in Accounting Information System': 'BSAIS',
    'Bachelor of Science in Management Accounting': 'BSMA',
    'Bachelor of Science in Retail Technology and Consumer Service': 'BSRTCS',
    '2-yr. Associate in Retail Technology': 'ART',

    // ———— Hospitality Management —————————————————————————————

    'Bachelor of Science in Hospitality Management': 'BSHM',
    'Bachelor of Science in Culinary Management': 'BSCM',
    '3-yr. Hotel and Restaurant Administration': 'HRA',
    '2-yr. Hospitality and Restaurant Services': 'HRS',

    // ———— Tourism Management —————————————————————————————

    'Bachelor of Science in Tourism Management': 'BSTM',

    // ———— Engineering —————————————————————————————

    'Bachelor of Science in Computer Engineering': 'BSCpE',

    // ———— Arts & Sciences —————————————————————————————

    'Bachelor of Arts in Psychology': 'Bachelor of Arts in Psychology',
    'Bachelor of Multimedia Arts': 'BMMA',
    'Bachelor of Arts in Communication': 'BACOMM',

    // ———— Maritime —————————————————————————————

    'Bachelor of Science in Marine Transportation': 'BSMT',
    'Bachelor of Science in Marine Engineering': 'BSMarE',
    'Bachelor of Science in Naval Architecture and Marine Engineering': 'BSNAME',

    // ———— Criminal Justice Education —————————————————————————————

    'Bachelor of Science in Criminology': 'BSCrim',
  }

  return longNames[name] || ''
}