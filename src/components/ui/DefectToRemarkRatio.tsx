import React from 'react';

export interface DefectToRemarkRatioProps {
  ratio?: string;      // e.g. "90.91%"
  category?: string;   // e.g. "Medium"
  color?: string;      // e.g. "yellow", "red", "green"
}

const getCategoryBg = (color?: string) => {
  switch (color) {
    case 'red':
      return 'bg-red-600 text-red-1000';
    case 'yellow':
      return 'bg-yellow-400 text-yellow-1000';
    case 'green':
      return 'bg-green-400 text-green-1000';
    default:
      return 'bg-gray-400 text-gray-1000';
  }
};

const DefectToRemarkRatio: React.FC<DefectToRemarkRatioProps> = ({
  ratio,
  category,
  color,
}) => {
  return (
    <div className="rounded-2xl shadow bg-white p-4 w-full max-w-sm">
      <div className={`rounded-xl p-6 flex flex-col items-center justify-center w-full ${getCategoryBg(color)} bg-opacity-60`}>
        {ratio && (
          <>
            <div className="text-5xl font-extrabold text-gray-800 mb-2">{ratio}</div>
          </>
        )}
        <div className="text-gray-600 mb-2">Defect to Remark Ratio (%)</div>
        {category && (
          <span className={`px-4 py-1 rounded-full text-lg font-semibold mb-2 ${getCategoryBg(color)}`}>
            {category}
          </span>
        )}
        {/* Progress Bar below the category badge */}
        {ratio && (
          <>
            <div className="w-full flex items-center mt-2 mb-1">
              <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${getCategoryBg(color).split(' ')[0]}`}
                  style={{ width: `${parseFloat(ratio) || 0}%` }}
                />
              </div>
            </div>
            {/* Percentage labels below the bar */}
            <div className="w-full flex justify-between text-gray-600 text-sm mt-1">
              <span>0.0</span>
              <span>0.5</span>
              <span>1.0</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DefectToRemarkRatio;