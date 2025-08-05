// components/AssociatedColleges.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { University } from 'lucide-react';

const AssociatedColleges = () => {
  const { user } = useAuth();
  const colleges = user?.colleges || [];

  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold mb-2 flex items-center">
        <University className="w-5 h-5 mr-2" />
        Associated Colleges
      </h3>
      <ul className="space-y-2">
        {colleges.length > 0 ? (
          colleges.map((college, idx) => (
            <li key={idx} className="bg-gray-100 p-3 rounded-lg shadow-sm flex justify-between items-center">
              <span>{college.name}</span>
              <span
                className={`px-2 py-1 text-xs rounded ${
                  college.status === 'Verified'
                    ? 'bg-green-200 text-green-800'
                    : 'bg-yellow-200 text-yellow-800'
                }`}
              >
                {college.status}
              </span>
            </li>
          ))
        ) : (
          <p className="text-gray-500">No associated colleges.</p>
        )}
      </ul>
    </div>
  );
};

export default AssociatedColleges;
