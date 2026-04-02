import React, { useEffect } from 'react';
import { Card, CardContent } from './Card';
import { Button } from './Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getAllProjects } from '../../api/projectget';

interface Project {
  id: string;
  name?: string;
  projectName?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  projectStatus?: string;
  clientName?: string;
  country?: string;
  state?: string;
  email?: string;
  phoneNo?: string;
  userId?: number;
}

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelect: (id: string, projectData?: Project) => void;
  className?: string;

}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  selectedProjectId,
  onSelect,
  className = '',


}) => {
  const [backendProjects, setBackendProjects] = React.useState<Project[]>([]);
  useEffect(() => {
    getAllProjects()
      .then((data: any) => {
        let projectsArray = Array.isArray(data)
          ? data
          : (data && Array.isArray(data.data))
            ? data.data
            : [];
        setBackendProjects(projectsArray);
      })
  }, [])


  return (
    <Card className={className}>
      <CardContent className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Project Selection</h2>
        <div className="relative flex items-center">
          <button
            onClick={() => {
              const container = document.getElementById('project-scroll');
              if (container) container.scrollLeft -= 200;
            }}
            className="flex-shrink-0 z-10 bg-white shadow-md rounded-full p-1 hover:bg-gray-50 mr-2"
            type="button"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div
            id="project-scroll"
            className="flex space-x-2 overflow-x-auto pb-2 scroll-smooth flex-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', maxWidth: '100%' }}
          >
                         {backendProjects.map((project) => {
               const isSelected = Number(selectedProjectId) === (Number(project?.id));
               return (
                 <Button
                   key={project.id}
                   variant={isSelected ? 'primary' : 'secondary'}
                   onClick={() => onSelect(project?.id, project)}
                   className="whitespace-nowrap m-2"
                 >
                   {project?.projectName || project?.name}
                 </Button>
               );
             })}
          </div>
          <button
            onClick={() => {
              const container = document.getElementById('project-scroll');
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

export default ProjectSelector; 