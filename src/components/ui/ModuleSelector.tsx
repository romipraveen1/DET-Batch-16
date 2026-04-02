import React from "react";
import { Card, CardContent } from "./Card";
import { Button } from "./Button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Module {
  id: string;
  name: string;
}

interface ModuleSelectorProps {
  modules: Module[];
  selectedModuleId: string | null;
  onSelect: (id: string) => void;
  className?: string;
  label?: string;
}

export const ModuleSelector: React.FC<ModuleSelectorProps> = ({
  modules,
  selectedModuleId,
  onSelect,
  className = "",
  label = "Module Selection",
}) => {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{label}</h2>
        <div className="relative flex items-center">
          <button
            onClick={() => {
              const container = document.getElementById("module-scroll");
              if (container) container.scrollLeft -= 200;
            }}
            className="flex-shrink-0 z-10 bg-white shadow-md rounded-full p-1 hover:bg-gray-50 mr-2"
            type="button"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div
            id="module-scroll"
            className="flex space-x-2 overflow-x-auto pb-2 scroll-smooth flex-1"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              maxWidth: "100%",
            }}
          >
            {modules.map((module) => (
              <Button
                key={module.id}
                variant={
                  selectedModuleId === module.id ? "primary" : "secondary"
                }
                onClick={() => onSelect(module.id)}
                className="whitespace-nowrap m-2"
              >
                {module.name}
              </Button>
            ))}
          </div>
          <button
            onClick={() => {
              const container = document.getElementById("module-scroll");
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

export default ModuleSelector;
