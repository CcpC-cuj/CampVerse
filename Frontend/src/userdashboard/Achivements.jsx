// components/Achievements.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Award } from 'lucide-react';

const Achievements = () => {
  const { user } = useAuth();
  const achievements = user?.achievements || [];

  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold mb-2 flex items-center">
        <Award className="w-5 h-5 mr-2" />
        Achievements
      </h3>
      <div className="flex flex-wrap gap-2">
        {achievements.length > 0 ? (
          achievements.map((achievement, idx) => (
            <span key={idx} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm shadow-sm">
              {achievement}
            </span>
          ))
        ) : (
          <p className="text-gray-500">No achievements yet.</p>
        )}
      </div>
    </div>
  );
};

export default Achievements;
