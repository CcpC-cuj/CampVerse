import React, { useEffect, useMemo, useState } from 'react';
import {
  getDashboard,
  updateMe,
  uploadProfilePhoto,
  searchInstitutions,
  setInstitutionForMe,
  requestNewInstitution
} from '../api';
import { useAuth } from '../contexts/AuthContext';

const SUGGESTED_INTERESTS = ['Hackathons', 'Robotics', 'AI/ML', 'Open Source', 'Sports', 'Cultural', 'Debate', 'Entrepreneurship'];
const SUGGESTED_SKILLS = ['JavaScript', 'Python', 'C++', 'UI/UX', 'Data Science', 'Public Speaking', 'Leadership'];
const SUGGESTED_GOALS = ['Get internship', 'Win a hackathon', 'Publish a paper', 'Improve DSA', 'Learn design'];

const Chip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 px-2 py-1 rounded text-sm">
    {label}
    {onRemove && (
      <button aria-label={`Remove ${label}`} onClick={onRemove} className="text-slate-400 hover:text-white">×</button>
    )}
  </span>
);

const SuggestionPills = ({ items, onPick }) => (
  <div className="flex flex-wrap gap-2 mt-2">
    {items.map((s) => (
      <button key={s} onClick={() => onPick(s)} className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs hover:bg-slate-700">
        + {s}
      </button>
    ))}
  </div>
);

const StepHeader = ({ step, total }) => (
  <div className="text-center mb-6">
    <h2 className="text-xl font-semibold text-white mb-2">Step {step} of {total}</h2>
    <div className="flex justify-center space-x-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`w-2 h-2 rounded-full ${i < step ? 'bg-blue-500' : 'bg-slate-600'}`} />
      ))}
    </div>
  </div>
);

const OnboardingModal = ({ visible, onClose, onComplete }) => {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    interests: user?.interests || [],
    skills: user?.skills || [],
    learningGoals: user?.learningGoals || []
  });
  const [interestInput, setInterestInput] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [goalInput, setGoalInput] = useState('');

  // Filter suggestions to hide already selected items
  const filteredInterestSuggestions = useMemo(
    () => SUGGESTED_INTERESTS.filter(s => !(preferences.interests || []).includes(s)),
    [preferences.interests]
  );
  const filteredSkillSuggestions = useMemo(
    () => SUGGESTED_SKILLS.filter(s => !(preferences.skills || []).includes(s)),
    [preferences.skills]
  );
  const filteredGoalSuggestions = useMemo(
    () => SUGGESTED_GOALS.filter(s => !(preferences.learningGoals || []).includes(s)),
    [preferences.learningGoals]
  );

  // Step 4: institution
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [newInstitution, setNewInstitution] = useState({
    name: '',
    type: 'university',
    location: { city: '', state: '', country: '' },
    website: '',
    phone: '',
    info: ''
  });

  // Step 5: profile photo
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    if (visible && user) {
      setPreferences({
        interests: user.interests || [],
        skills: user.skills || [],
        learningGoals: user.learningGoals || []
      });
    }
  }, [visible, user]);

  const addChip = (key, value) => {
    if (value.trim() && !preferences[key].includes(value.trim())) {
      setPreferences(prev => ({
        ...prev,
        [key]: [...prev[key], value.trim()]
      }));
    }
  };

  const removeChip = (key, idx) => {
    setPreferences(prev => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== idx)
    }));
  };

  const next = async () => {
    if (step === 3) {
      // Save preferences
      try {
        setLoading(true);
        await updateMe({ ...preferences });
        setStep(4);
      } catch (error) {
        console.error('Failed to save preferences:', error);
      } finally {
        setLoading(false);
      }
    } else if (step === 4) {
      // Save institution
      try {
        setLoading(true);
        if (selectedInstitution) {
          await setInstitutionForMe({ institutionId: selectedInstitution._id });
        } else if (newInstitution.name) {
          await requestNewInstitution(newInstitution);
        }
        setStep(5);
      } catch (error) {
        console.error('Failed to save institution:', error);
      } finally {
        setLoading(false);
      }
    } else if (step === 5) {
      // Save profile photo and complete
      try {
        setLoading(true);
        if (photoFile) {
          const formData = new FormData();
          formData.append('photo', photoFile);
          await uploadProfilePhoto(formData);
        }
        
        // Mark onboarding as completed
        await updateMe({ onboardingCompleted: true });
        onComplete();
      } catch (error) {
        console.error('Failed to complete onboarding:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setStep(step + 1);
    }
  };

  const back = () => setStep((s) => Math.max(1, s - 1));

  const searchInstitutions = async (query) => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    try {
      const data = await searchInstitutions(query);
      setResults(data);
    } catch (error) {
      console.error('Failed to search institutions:', error);
      setResults([]);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-white">Complete Your Profile</h1>
          <button onClick={onClose} className="text-slate-400 hover:text-white">×</button>
        </div>

        <StepHeader step={step} total={5} />

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-300">Interests</label>
              <div className="flex gap-2 mt-1">
                {preferences.interests.map((v, i) => (
                  <Chip key={`${v}-${i}`} label={v} onRemove={()=>removeChip('interests',i)} />
                ))}
              </div>
              <SuggestionPills items={filteredInterestSuggestions} onPick={(v)=>addChip('interests', v)} />
            </div>
            <div>
              <label className="text-sm text-slate-300">Skills</label>
              <div className="flex gap-2 mt-1">
                {preferences.skills.map((v, i) => (
                  <Chip key={`${v}-${i}`} label={v} onRemove={()=>removeChip('skills',i)} />
                ))}
              </div>
              <SuggestionPills items={filteredSkillSuggestions} onPick={(v)=>addChip('skills', v)} />
            </div>
            <div>
              <label className="text-sm text-slate-300">Learning Goals</label>
              <div className="flex gap-2 mt-1">
                {preferences.learningGoals.map((v, i) => (
                  <Chip key={`${v}-${i}`} label={v} onRemove={()=>removeChip('learningGoals',i)} />
                ))}
              </div>
              <SuggestionPills items={filteredGoalSuggestions} onPick={(v)=>addChip('learningGoals', v)} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-300">Search Your Institution</label>
              <input
                type="text"
                placeholder="Start typing institution name..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  searchInstitutions(e.target.value);
                }}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white"
              />
              {results.length > 0 && (
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {results.map((inst) => (
                    <button
                      key={inst._id}
                      onClick={() => setSelectedInstitution(inst)}
                      className={`w-full p-2 text-left rounded ${
                        selectedInstitution?._id === inst._id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <div className="font-medium">{inst.name}</div>
                      <div className="text-xs text-slate-400">{inst.type}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-center text-slate-400">- OR -</div>

            <div>
              <label className="text-sm text-slate-300">Request New Institution</label>
              <input
                type="text"
                placeholder="Institution name"
                value={newInstitution.name}
                onChange={(e) => setNewInstitution(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white mb-2"
              />
              <select
                value={newInstitution.type}
                onChange={(e) => setNewInstitution(prev => ({ ...prev, type: e.target.value }))}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white mb-2"
              >
                <option value="university">University</option>
                <option value="college">College</option>
                <option value="school">School</option>
                <option value="institute">Institute</option>
              </select>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-300">Profile Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white"
              />
              {photoPreview && (
                <div className="mt-2">
                  <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded object-cover" />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          {step > 1 && (
            <button
              onClick={back}
              className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600"
            >
              Back
            </button>
          )}
          <button
            onClick={next}
            disabled={loading}
            className="ml-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : step === 5 ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
