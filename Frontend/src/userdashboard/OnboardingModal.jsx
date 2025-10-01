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
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-xl font-semibold">Complete your profile</h3>
    <span className="text-sm text-slate-400">Step {step} of {total}</span>
  </div>
);

const OnboardingModal = ({ visible, onComplete }) => {
  const { login } = useAuth();
  const totalSteps = 4;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: basic profile
  const [profile, setProfile] = useState({ name: '', phone: '', Gender: '', DOB: '', collegeIdNumber: '' });

  // Step 2: photo
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [existingPhotoUrl, setExistingPhotoUrl] = useState('');

  // Step 3: preferences
  const [preferences, setPreferences] = useState({ interests: [], skills: [], learningGoals: [] });
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
  const [reqInstitution, setReqInstitution] = useState({ name: '', type: '', website: '', phone: '', info: '' });

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        setLoading(true);
        const data = await getDashboard();
        if (data?.user) {
          setProfile({
            name: data.user.name || '',
            phone: data.user.phone || '',
            Gender: data.user.gender || '',
            DOB: data.user.dateOfBirth ? String(data.user.dateOfBirth).slice(0, 10) : '',
            collegeIdNumber: data.user.collegeIdNumber || ''
          });
          setExistingPhotoUrl(data.user.profilePhoto || '');
          setPreferences({
            interests: data.user.interests || [],
            skills: data.user.skills || [],
            learningGoals: data.user.learningGoals || []
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  // Auto-skip Step 2 if a photo already exists and user didn't choose a new one
  useEffect(() => {
    if (visible && step === 2 && existingPhotoUrl && !photoFile) {
      setStep(3);
    }
  }, [visible, step, existingPhotoUrl, photoFile]);

  useEffect(() => {
    if (!query) { setResults([]); return; }
    const id = setTimeout(async () => {
      try {
        const res = await searchInstitutions(query);
        setResults(Array.isArray(res) ? res : []);
      } catch {}
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const addChip = (key, value) => {
    if (!value) return;
    setPreferences((p) => ({ ...p, [key]: Array.from(new Set([...(p[key] || []), value])) }));
  };
  const removeChip = (key, idx) => {
    setPreferences((p) => ({ ...p, [key]: (p[key] || []).filter((_, i) => i !== idx) }));
  };

  const next = async () => {
    setError('');
    try {
      setLoading(true);
      if (step === 1) {
        if (!profile.name || !profile.phone) {
          setError('Name and phone are required');
          return;
        }
        const res = await updateMe({
          name: profile.name,
          phone: profile.phone,
          gender: profile.Gender,
          dateOfBirth: profile.DOB,
          collegeIdNumber: profile.collegeIdNumber,
        });
        if (res?.user) {
          const token = localStorage.getItem('token');
          if (token) login(token, res.user);
        }
        setStep(step + 1);
      } else if (step === 2) {
        if (photoFile) {
          const res = await uploadProfilePhoto(photoFile);
          if (res?.user) {
            const token = localStorage.getItem('token');
            if (token) login(token, res.user);
            setExistingPhotoUrl(res.user.profilePhoto || existingPhotoUrl);
          }
        }
        setStep(step + 1);
      } else if (step === 3) {
        const res = await updateMe(preferences);
        if (res?.user) {
          const token = localStorage.getItem('token');
          if (token) login(token, res.user);
        }
        setStep(step + 1);
      } else if (step === 4) {
        if (selectedInstitution) {
          const res = await setInstitutionForMe(selectedInstitution._id);
          if (res?.user) {
            const token = localStorage.getItem('token');
            if (token) login(token, res.user);
          }
        } else if (reqInstitution.name && reqInstitution.type) {
          await requestNewInstitution(reqInstitution);
        } else {
          setError('Select an institution or request a new one (name and type).');
          return;
        }
        onComplete?.();
      }
    } catch (e) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const back = () => setStep((s) => Math.max(1, s - 1));

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl p-6 text-white">
        <StepHeader step={step} total={totalSteps} />
        {error && <div className="mb-3 text-red-400">{error}</div>}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-300">Full Name</label>
              <input className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2" value={profile.name} onChange={(e)=>setProfile({...profile,name:e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-slate-300">Phone</label>
              <input className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2" value={profile.phone} onChange={(e)=>setProfile({...profile,phone:e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-slate-300">Gender</label>
              <select className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2" value={profile.Gender} onChange={(e)=>setProfile({...profile,Gender:e.target.value})}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-300">Date of Birth</label>
              <input type="date" className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2" value={profile.DOB} onChange={(e)=>setProfile({...profile,DOB:e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-slate-300">College/Enrollment Number</label>
              <input className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2" value={profile.collegeIdNumber} onChange={(e)=>setProfile({...profile,collegeIdNumber:e.target.value})} placeholder="Registration / Admission / Enrollment number" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div>
              <label className="text-sm text-slate-300">Upload Profile Photo</label>
              <input type="file" accept="image/*" className="w-full mt-1" onChange={(e)=>{
                const f = e.target.files?.[0];
                setPhotoFile(f||null);
                setPhotoPreview(f ? URL.createObjectURL(f) : '');
              }} />
              {existingPhotoUrl && !photoFile && (
                <p className="text-xs text-slate-400 mt-2">A profile photo is already set; you can skip this step.</p>
              )}
            </div>
            {(photoPreview || existingPhotoUrl) && (
              <img src={photoPreview || existingPhotoUrl} alt="preview" className="w-32 h-32 rounded-lg object-cover border border-slate-700" />
            )}
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm text-slate-300">Interests</label>
              <div className="flex gap-2 mt-1">
                <input className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2" value={interestInput} onChange={(e)=>setInterestInput(e.target.value)} placeholder="Add interest and press +" />
                <button className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-3 rounded" onClick={()=>{addChip('interests', interestInput.trim()); setInterestInput('');}}>+</button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {preferences.interests.map((v,i)=>(
                  <Chip key={`${v}-${i}`} label={v} onRemove={()=>removeChip('interests',i)} />
                ))}
              </div>
              <SuggestionPills items={filteredInterestSuggestions} onPick={(v)=>addChip('interests', v)} />
            </div>
            <div>
              <label className="text-sm text-slate-300">Skills</label>
              <div className="flex gap-2 mt-1">
                <input className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2" value={skillInput} onChange={(e)=>setSkillInput(e.target.value)} placeholder="Add skill and press +" />
                <button className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-3 rounded" onClick={()=>{addChip('skills', skillInput.trim()); setSkillInput('');}}>+</button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {preferences.skills.map((v,i)=>(
                  <Chip key={`${v}-${i}`} label={v} onRemove={()=>removeChip('skills',i)} />
                ))}
              </div>
              <SuggestionPills items={filteredSkillSuggestions} onPick={(v)=>addChip('skills', v)} />
            </div>
            <div>
              <label className="text-sm text-slate-300">Learning Goals</label>
              <div className="flex gap-2 mt-1">
                <input className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2" value={goalInput} onChange={(e)=>setGoalInput(e.target.value)} placeholder="Add goal and press +" />
                <button className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-3 rounded" onClick={()=>{addChip('learningGoals', goalInput.trim()); setGoalInput('');}}>+</button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {preferences.learningGoals.map((v,i)=>(
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
              <label className="text-sm text-slate-300">Search Institution</label>
              <input className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2" value={query} onChange={(e)=>{setQuery(e.target.value); setSelectedInstitution(null);}} placeholder="Type college/university name or domain" />
              {results.length > 0 && (
                <ul className="mt-2 max-h-48 overflow-y-auto border border-slate-700 rounded divide-y divide-slate-800">
                  {results.map((r)=> (
                    <li key={r._id} className={`px-3 py-2 hover:bg-slate-800 cursor-pointer ${selectedInstitution?._id===r._id?'bg-slate-800':''}`} onClick={()=> setSelectedInstitution(r)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-slate-400">{r.emailDomain}</div>
                        </div>
                        {!r.isVerified && <span className="text-xs text-amber-400">Unverified</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {selectedInstitution && (
                <div className="mt-2 text-sm text-green-400">Selected: {selectedInstitution.name}</div>
              )}
            </div>
            <div className="text-slate-400 text-sm">If not found, request a new institution:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-300">Name</label>
                <input className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2" value={reqInstitution.name} onChange={(e)=>setReqInstitution({...reqInstitution,name:e.target.value})} />
              </div>
              <div>
                <label className="text-sm text-slate-300">Type</label>
                <select className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2" value={reqInstitution.type} onChange={(e)=>setReqInstitution({...reqInstitution,type:e.target.value})}>
                  <option value="">Select</option>
                  <option value="college">College</option>
                  <option value="university">University</option>
                  <option value="org">Organization</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-300">Website (optional)</label>
                <input className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2" value={reqInstitution.website} onChange={(e)=>setReqInstitution({...reqInstitution,website:e.target.value})} />
              </div>
              <div>
                <label className="text-sm text-slate-300">Phone (optional)</label>
                <input className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2" value={reqInstitution.phone} onChange={(e)=>setReqInstitution({...reqInstitution,phone:e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-slate-300">Info (optional)</label>
                <textarea rows={3} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2" value={reqInstitution.info} onChange={(e)=>setReqInstitution({...reqInstitution,info:e.target.value})} />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <button disabled={loading || step===1} onClick={back} className="px-4 py-2 border border-slate-700 rounded disabled:opacity-50">Back</button>
          <div className="flex gap-2">
            <button disabled={loading} onClick={next} className="px-4 py-2 bg-[#9b5de5] hover:bg-[#8c4be1] rounded text-white">
              {step === totalSteps ? (loading ? 'Submitting...' : 'Finish') : (loading ? 'Saving...' : 'Next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;