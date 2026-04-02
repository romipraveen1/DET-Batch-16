import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Rocket, ListChecks } from 'lucide-react';


export const Releases: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Release Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Execution Card */}
        <Card
          hover
          className="cursor-pointer group transition-all duration-300 hover:shadow-lg hover:scale-[1.03]"
          onClick={() => navigate(`/projects/${projectId}/releases/test-execution`)}
        >
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Rocket className="w-12 h-12 text-blue-500 mb-4 group-hover:text-blue-700 transition-colors" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Test Execution</h2>
            <p className="text-gray-600 text-center">Manage and view test case execution for releases.</p>
          </CardContent>
        </Card>
        {/* Allocation Card */}
        <Card
          hover
          className="cursor-pointer group transition-all duration-300 hover:shadow-lg hover:scale-[1.03]"
          onClick={() => navigate(`/projects/${projectId}/releases/allocation`)}
        >
          <CardContent className="flex flex-col items-center justify-center p-8">
            <ListChecks className="w-12 h-12 text-green-500 mb-4 group-hover:text-green-700 transition-colors" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Allocation</h2>
            <p className="text-gray-600 text-center">Allocate and organize test cases for releases.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};