import React from "react";
import { Card, CardContent } from "./Card";
import { Button } from "./Button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Submodule {
  id: string | number;
  name: string;
  // ...other fields if needed
}

interface SubmoduleSelectorProps {
  submodules: Submodule[];
  selectedSubmoduleId: string | number | null;
  onSelect: (id: string | number) => void;
  className?: string;
  label?: string;
}

export const SubmoduleSelector: React.FC<SubmoduleSelectorProps> = ({
  submodules,
  selectedSubmoduleId,
  onSelect,
  className = "",
  label = "Submodule Selection",
}) => {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{label}</h2>
        <div className="relative flex items-center">
          <button
            onClick={() => {
              const container = document.getElementById("submodule-scroll");
              if (container) container.scrollLeft -= 200;
            }}
            className="flex-shrink-0 z-10 bg-white shadow-md rounded-full p-1 hover:bg-gray-50 mr-2"
            type="button"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div
            id="submodule-scroll"
            className="flex space-x-2 overflow-x-auto pb-2 scroll-smooth flex-1"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              maxWidth: "100%",
            }}
          >
            {submodules.length === 0 ? (
              <span className="italic text-gray-400">
                No submodules for this module
              </span>
            ) : (
              submodules.map((submodule) => (
                <Button
                  key={submodule.id}
                  variant={
                    selectedSubmoduleId === submodule.id
                      ? "primary"
                      : "secondary"
                  }
                  onClick={() => onSelect(submodule.id)}
                  className="whitespace-nowrap m-2"
                >
                  {submodule.name}
                </Button>
              ))
            )}
          </div>
          <button
            onClick={() => {
              const container = document.getElementById("submodule-scroll");
              if (container) container.scrollLeft += 200;
            }}
            className="flex-shrink-0 z-10 bg-white shadow-md rounded-full p-1 hover:bg-gray-50 ml-2"
            type="button"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubmoduleSelector;
