import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { GitBranch, ChevronLeft, ListPlus } from 'lucide-react';

const Status: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Back Button */}
      <div className="mb-6 flex justify-end">
        <Button
          variant="secondary"
          onClick={() => navigate('/configurations')}
          className="flex items-center"
        >
          <ChevronLeft className="w-5 h-5 mr-2" /> Back
        </Button>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Status Configuration</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Status Type Card */}
        <Card
          hover
          className="cursor-pointer group transition-all duration-300 hover:shadow-lg hover:scale-[1.03]"
          onClick={() => navigate('/configurations/status/type')}
        >
          <CardContent className="flex flex-col items-center justify-center p-8">
            <ListPlus className="w-12 h-12 text-blue-500 mb-4 group-hover:text-blue-700 transition-colors" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Status Type</h2>
            <p className="text-gray-600 text-center">Manage status type configurations for defects and test cases.</p>
          </CardContent>
        </Card>
        {/* Workflow Card */}
        <Card
          hover
          className="cursor-pointer group transition-all duration-300 hover:shadow-lg hover:scale-[1.03]"
          onClick={() => navigate('/configurations/status/workflow')}
        >
          <CardContent className="flex flex-col items-center justify-center p-8">
            <GitBranch className="w-12 h-12 text-blue-500 mb-4 group-hover:text-blue-700 transition-colors" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Workflow</h2>
            <p className="text-gray-600 text-center">Manage workflow configurations and status transitions.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Status;