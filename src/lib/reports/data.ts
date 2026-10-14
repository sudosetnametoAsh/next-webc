import type {
    ClearanceRecord,
    ClearanceReportSource,
    ClearanceTemplateInfo,
    SignoffStatus,
  } from "@/lib/reports/types";
  
  /**
   * THE ONLY FILE YOU NEED TO REPLACE when connecting the backend.
   * Return the same `ClearanceReportSource` shape from your API and
   * delete everything below `getReportSource`.
   */
  export async function getReportSource(): Promise<ClearanceReportSource> {
    // TODO(backend): e.g.
    // const res = await fetch(`${process.env.API_URL}/admin/reports`, { cache: "no-store" });
    // if (!res.ok) throw new Error("Failed to load report data");
    // return res.json();
    return buildMockSource();
  }
  
  /* ------------------------- Dummy data (remove later) ------------------------- */
  
  interface MockTemplate extends ClearanceTemplateInfo {
    departments: string[];
    count: number;
  }
  
  // Mirrors your Templates page. Add more courses freely.
  const MOCK_TEMPLATES: MockTemplate[] = [
    {
      code: "STAFF",
      name: "Staff Clearance",
      kind: "staff",
      count: 7,
      departments: ["Cashier", "Clinic", "Computer Laboratory", "Guidance Office", "Library", "Registrar"],
    },
    {
      code: "BSCPE",
      name: "Bachelor of Science in Computer Engineering",
      kind: "student",
      count: 124,
      departments: ["Cashier", "Clinic", "Computer Laboratory", "Library", "School Admin", "Registrar", "Guidance Office"],
    },
    {
      code: "BSCS",
      name: "Bachelor of Science in Computer Science",
      kind: "student",
      count: 54,
      departments: ["Cashier", "Clinic", "Computer Laboratory", "Library", "School Admin", "Registrar", "Guidance Office"],
    },
    {
      code: "BSIT",
      name: "Bachelor of Science in Information Technology",
      kind: "student",
      count: 75,
      departments: ["Cashier", "Computer Laboratory", "Library", "School Admin", "Registrar", "Guidance Office"],
    },
  ];
  
  const FIRST_NAMES = ["Jan", "Maria", "Juan", "Angelo", "Kristine", "Mark", "Althea", "Carlo", "Bianca", "Paolo", "Nicole", "Joshua", "Andrea", "Miguel", "Trisha", "Rafael", "Camille", "Gabriel", "Jasmine", "Renz"];
  const SURNAMES = ["Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "Garcia", "Mendoza", "Torres", "Villanueva", "Flores", "Ramos", "Castillo", "Aquino", "Dela Cruz", "Navarro", "Salazar", "Domingo", "Pascual", "Rivera", "Soriano"];
  
  // Small seeded PRNG so the dummy data is stable between renders.
  function mulberry32(seed: number) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  
  function buildMockSource(): ClearanceReportSource {
    const random = mulberry32(2026);
    const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  
    const rollStatus = (): SignoffStatus => {
      const n = random();
      if (n < 0.6) return "signed";
      if (n < 0.96) return "pending";
      return "incomplete";
    };
  
    const records: ClearanceRecord[] = [];
    let serial = 1;
  
    for (const template of MOCK_TEMPLATES) {
      for (let i = 0; i < template.count; i++) {
        const fullyCleared = random() < 0.18;
        records.push({
          id: `${template.code}-${i + 1}`,
          name: `${pick(SURNAMES)}, ${pick(FIRST_NAMES)}`,
          idNumber: `02000${String(100000 + serial++)}`,
          templateCode: template.code,
          signoffs: template.departments.map((department) => ({
            department,
            status: fullyCleared ? "signed" : rollStatus(),
          })),
        });
      }
    }
  
    return {
      term: "1st Semester, S.Y. 2026-2027",
      templates: MOCK_TEMPLATES.map(({ code, name, kind }) => ({ code, name, kind })),
      records,
    };
  }