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
      <div className="bg-purple-600 text-white rounded-2xl p-4 shadow-md flex items-center">
        <Calendar className="w-6 h-6 mr-3" />
        <div>
          <div className="text-sm">Events Participated</div>
          <div className="text-xl font-bold">{eventsCount}</div>
        </div>
      </div>
      <div className="bg-yellow-500 text-white rounded-2xl p-4 shadow-md flex items-center">
        <Trophy className="w-6 h-6 mr-3" />
        <div>
          <div className="text-sm">Achievements</div>
          <div className="text-xl font-bold">{achievementsCount}</div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
