import { Dispatch, SetStateAction } from "react";

type Props = {
    sections: Sections[]
    setSectionId: Dispatch<SetStateAction<string | null>>;
    activeSectionId: string;
}

type Sections = {
  section_number: number;
  year: number;
  semester: number;
  section_id: number;
};

export default function SectionList({sections, setSectionId, activeSectionId}: Props) {
    return (
        <div className="section-list">
            <h3>Sections</h3>
            {sections.map((section) => (
                <button
                    key={section.section_id}
                    onClick={() => setSectionId(String(section.section_id))}
                    className={`sidebar-button section-button ${String(section.section_id) === activeSectionId ? 'active' : ''}`}
                >
                    {section.year}/{section.semester} - Sec {section.section_number}
                </button>
            ))}

            <style jsx>{`
                .sidebar-button {
                    display: block;
                    width: 100%;
                    padding: 0.75rem 1rem;
                    margin-bottom: 0.5rem;
                    text-align: left;
                    background-color: transparent;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
                    font-size: 1rem;
                }

                .sidebar-button:hover {
                    background-color: #f0f0f0;
                    border-color: #ccc;
                }

                .sidebar-button.active {
                    background-color: #007bff;
                    color: white;
                    border-color: #007bff;
                    box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3);
                }
                
                .section-button {
                    font-size: 0.9rem;
                    background-color: #f9f9f9;
                    margin-left: 1rem; /* Indent sections */
                }
            `}</style>
        </div>
    )
}

