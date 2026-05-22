import { Dispatch, SetStateAction } from "react";
import { Button } from "../ui/button";

type Props = {
    sections: Sections[] | undefined
    setSectionId: Dispatch<SetStateAction<string | null>>;
    activeSectionId: string | null;
}

type Sections = {
    section_number: number;
    year: number;
    semester: number;
    section_id: number;
};

export default function SectionList({ sections, setSectionId, activeSectionId }: Props) {
    return (
        <div className="flex flex-row gap-2">
            {/* <h2>Sections</h2> */}
            {sections?.map((section) => {
                const isActive = String(section.section_id) === activeSectionId
                return (
                    <Button
                        key={section.section_id}
                        onClick={() => setSectionId(String(section.section_id))}
                        variant={isActive ? "default" : "outline"}
                        className="p-2.5!"

                    >
                        {section.year}/{section.semester} - Sec {section.section_number}
                    </Button>
                )
            })}
        </div>
    )
}

