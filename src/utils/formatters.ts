// Helper function to expand course abbreviations
export function expandCourseAbbreviation(abbreviation: string): string {
  const shortNames: Record<string, string> = {
    'BSCS': 'Bachelor of Science in Computer Science',
    'BSIT': 'Bachelor of Science in Information Technology',
    'BSTM': 'Bachelor of Science in Tourism Management',
    'BSCPE': 'Bachelor of Science in Computer Engineering',
    'BMMA': 'Bachelor of Multimedia Arts',
    'BSCM': 'Bachelor of Science of Culinary Management',
    'BSBA': 'Bacholor of Science of Business Administration'
  }

  return shortNames[abbreviation] || ''
}

// Helper function to shrink couse names
export function shrinkCourseName(name: string): string {
  const longNames: Record<string, string> = {
    'Bachelor of Science in Computer Science': 'BSCS',
    'Bachelor of Science in Information Technology': 'BSIT',
    'Bachelor of Science in Tourism Management': 'BSTM',
    'Bachelor of Science in Computer Engineering': 'BSCpE',
    'Bachelor of Multimedia Arts': 'BMMA',
    'Bachelor of Science in Culinary Arts': 'BSCM',
    'Bachelor of Science in Business Administration': 'BSBA'
  }

  return longNames[name] || ''
}