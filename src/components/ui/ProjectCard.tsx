import React from 'react';
import { TrendingUp, AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';

interface ProjectCardProps {
  name: string;
  risk: 'high' | 'medium' | 'low';
  defectCounts: { high: number; medium: number; low: number };
  onClick: () => void;
  size?: 'small' | 'large';
  customBgClass?: string; // Optional custom Tailwind class for background
  riskTextClass?: string; // Optional custom Tailwind class for risk label text color
  riskLabel?: string; // Optional custom risk label text
}

const riskTheme = {
  high: {
    border: 'border-red-500',
    bg: 'bg-gradient-to-br from-red-600 to-red-800',
    text: 'text-white',
    dot: 'bg-red-500',
    badge: 'bg-red-600/80 text-white',
    icon: 'text-white',
  },
  medium: {
    border: 'border-yellow-500',
    bg: 'bg-gradient-to-br from-yellow-400 to-yellow-500',
    text: 'text-white',
    dot: 'bg-yellow-400',
    badge: 'bg-yellow-500/80 text-white',
    icon: 'text-white',
  },
  low: {
    border: 'border-green-600',
    bg: 'bg-gradient-to-br from-green-500 to-green-600',
    text: 'text-white',
    dot: 'bg-green-500',
    badge: 'bg-green-600/80 text-white',
    icon: 'text-white',
  },
};

export const ProjectCard: React.FC<ProjectCardProps & { forcedRisk?: 'high' | 'medium' | 'low' }> = ({ name, risk, defectCounts, onClick, size = 'large', forcedRisk, customBgClass, riskTextClass, riskLabel }) => {
  // If forcedRisk is provided, override the risk for color/icon
  const displayRisk = forcedRisk || risk;
  const theme = riskTheme[displayRisk];
  const cardSize = size === 'small' ? 'w-56 h-56' : 'w-72 h-72';
  const iconSize = size === 'small' ? 'w-8 h-8' : 'w-10 h-10';
  const nameText = size === 'small' ? 'text-xl' : 'text-2xl';
  const badgeText = size === 'small' ? 'text-xs' : 'text-sm';
  // Icon selection based on risk
  let RiskIcon = null;
  if (displayRisk === 'high') RiskIcon = AlertCircle;
  else if (displayRisk === 'medium') RiskIcon = AlertTriangle;
  else RiskIcon = CheckCircle;
  return (
    <button
      className={`relative ${cardSize} rounded-full border-4 shadow-xl flex flex-col items-center justify-between py-6 px-2 transition-transform hover:scale-105 hover:shadow-2xl focus:outline-none ring-1 ring-gray-200 ${customBgClass || theme.bg}`}
      onClick={onClick}
      aria-label={`Project card for ${name}`}
      style={{
        minWidth: size === 'small' ? '14rem' : '18rem',
        minHeight: size === 'small' ? '14rem' : '18rem',
      }}
    >
      {/* Icon based on risk */}
      <RiskIcon className={`${iconSize} mb-1 text-white`} />
      {/* Project Name */}
      <span className={`${nameText} font-bold mb-1 text-white`}>{name}</span>
      {/* Risk Badge */}
      <span className={`px-3 py-1 rounded-full font-semibold ${badgeText} bg-white/20 ${riskTextClass || 'text-white'} mb-1`}>
        {riskLabel || (displayRisk === 'high' ? 'High Risk' : displayRisk === 'medium' ? 'Medium Risk' : 'Low Risk')}
      </span>
    </button>
  );
};

export default ProjectCard; 