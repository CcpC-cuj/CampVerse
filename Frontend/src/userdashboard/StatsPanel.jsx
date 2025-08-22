// components/StatsPanel.jsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Calendar } from 'lucide-react';

const StatsPanel = () => {
  const { user } = useAuth();

  const eventsCount = user?.stats?.eventsCount || 0;
  const achievementsCount = user?.stats?.achievementsCount || 0;

  return (
    <div className="grid grid-cols-2 gap-4 mt-4">
      <div className="bg-gray-800/60 text-white rounded-2xl p-4 shadow-md flex items-center border border-[#9b5de5]/20">
        <Calendar className="w-6 h-6 mr-3 text-[#9b5de5]" />
        <div>
          <div className="text-sm text-gray-300">Events Participated</div>
          <div className="text-xl font-bold">{eventsCount}</div>
        </div>
      </div>
      <div className="bg-gray-800/60 text-white rounded-2xl p-4 shadow-md flex items-center border border-yellow-500/30">
        <Trophy className="w-6 h-6 mr-3 text-yellow-400" />
        <div>
          <div className="text-sm text-gray-300">Achievements</div>
          <div className="text-xl font-bold">{achievementsCount}</div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
