import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { createEventWithFiles, nominateCoHost } from "../api/events";
import { findUserByEmail } from "../api/users";

const CreateEventForm = ({ onSuccess, onClose }) => {
	const { user } = useAuth();
	const [currentStep, setCurrentStep] = useState(1);
	const [formErrors, setFormErrors] = useState({});
	const [eventForm, setEventForm] = useState({
		title: '',
		description: '',
		date: '',
		location: '',
		venue: '',
		organizationName: '',
		category: '',
		maxParticipants: '',
		isPaid: false,
		fee: '',
		tags: '',
		requirements: '',
		contactEmail: user?.email || '',
		contactPhone: user?.phone || '',
		bannerImage: null,
		logoImage: null,
		socialLinks: {
			website: '',
			linkedin: ''
		},
		audienceType: '',
		cohosts: [],
		sessions: [],
		eventLink: '',
		certificateEnabled: false,
		chatEnabled: false,
	});
	const [cohostInput, setCohostInput] = useState('');
	const [sessionInput, setSessionInput] = useState({ title: '', time: '', speaker: '' });
	const [bannerUrl, setBannerUrl] = useState(null);
	const [logoUrl, setLogoUrl] = useState(null);
	const [loading, setLoading] = useState(false);
	const getMinDate = () => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		return tomorrow.toISOString().slice(0, 16);
	};

	const validateStep = (step) => {
		const errors = {};
		switch (step) {
			case 1:
				if (!eventForm.title.trim()) errors.title = 'Event title is required';
				if (!eventForm.description.trim()) errors.description = 'Description is required';
				if (!eventForm.date) errors.date = 'Event date is required';
				break;
			case 2:
				// No validation needed for this step anymore as fields are optional or removed.
				break;
			case 3:
				if (!eventForm.location) errors.location = 'Location type is required';
				if (eventForm.location === 'offline' && !eventForm.venue.trim()) errors.venue = 'Venue is required for offline events';
				if (eventForm.location === 'online' && !eventForm.eventLink.trim()) errors.eventLink = 'Event link is required for online events';
				if (eventForm.location === 'hybrid' && (!eventForm.venue.trim() || !eventForm.eventLink.trim())) {
					if (!eventForm.venue.trim()) errors.venue = 'Venue is required for hybrid events';
					if (!eventForm.eventLink.trim()) errors.eventLink = 'Event link is required for hybrid events';
				}
				if (!eventForm.audienceType) errors.audienceType = 'Audience type is required';
				if (!eventForm.maxParticipants || parseInt(eventForm.maxParticipants) < 1) {
					errors.maxParticipants = 'Max participants is required and must be at least 1';
				}
				break;
			case 4:
				if (eventForm.isPaid && (!eventForm.fee || parseFloat(eventForm.fee) <= 0)) {
					errors.fee = 'Valid registration fee is required for paid events';
				}
				break;
		}
		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const nextStep = (e) => {
		if (e) e.preventDefault(); // Prevent any form submission
		console.log('Current step:', currentStep, 'Form data:', eventForm);
		if (validateStep(currentStep)) {
			console.log('Validation passed, moving to next step');
			setCurrentStep(prev => Math.min(prev + 1, 4));
		} else {
			console.log('Validation failed:', formErrors);
		}
	};

	const prevStep = (e) => {
		if (e) e.preventDefault(); // Prevent any form submission
		setCurrentStep(prev => Math.max(prev - 1, 1));
	};

	const handleFormChange = (e) => {
		const { name, value, type, files } = e.target;
		if (type === 'file') {
			const file = files[0];
			setEventForm(prev => ({ ...prev, [name]: file }));
			if (name === 'bannerImage' && file) setBannerUrl(URL.createObjectURL(file));
			if (name === 'logoImage' && file) setLogoUrl(URL.createObjectURL(file));
		} else if (name.includes('.')) {
			const [parent, child] = name.split('.');
			setEventForm(prev => ({
				...prev,
				[parent]: { ...prev[parent], [child]: value }
			}));
		} else {
			if (name === 'cohostInput') {
				setCohostInput(value);
			} else {
				setEventForm(prev => ({ ...prev, [name]: value }));
			}
		}
	};

	const handleAddCohost = () => {
		const email = cohostInput.trim();
		if (email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
			setEventForm(prev => ({
				...prev,
				cohosts: [...prev.cohosts, email]
			}));
			setCohostInput('');
		}
	};

	const handleRemoveCohost = (idx) => {
		setEventForm(prev => ({
			...prev,
			cohosts: prev.cohosts.filter((_, i) => i !== idx)
		}));
	};

	const handleAddSession = () => {
		if (sessionInput.title.trim() && sessionInput.time.trim() && sessionInput.speaker.trim()) {
			setEventForm(prev => ({
				...prev,
				sessions: [...prev.sessions, { ...sessionInput }]
			}));
			setSessionInput({ title: '', time: '', speaker: '' });
		}
	};

	const handleRemoveSession = (idx) => {
		setEventForm(prev => ({
			...prev,
			sessions: prev.sessions.filter((_, i) => i !== idx)
		}));
	};

		const handleSubmit = async (e) => {
		e.preventDefault();
		
		// Only allow submission on step 4
		if (currentStep !== 4) {
			console.log('Form submission prevented - not on step 4. Current step:', currentStep);
			return;
		}
		
		if (!validateStep(4)) return;
		
		setLoading(true);
		try {
			// Transform data to match backend schema exactly
			const eventData = {
				title: eventForm.title,
				description: eventForm.description,
				type: eventForm.category,
				organizationName: eventForm.organizationName,
				location: {
					type: eventForm.location || 'online',
					venue: eventForm.location === 'offline' || eventForm.location === 'hybrid' ? eventForm.venue : '',
					link: eventForm.location === 'online' || eventForm.location === 'hybrid' ? eventForm.eventLink : ''
				},
				capacity: parseInt(eventForm.maxParticipants) || 1,
				date: eventForm.date,
				isPaid: eventForm.isPaid || false,
				price: eventForm.isPaid ? parseFloat(eventForm.fee) || 0 : 0,
				tags: typeof eventForm.tags === 'string'
					? eventForm.tags.split(',').map(tag => tag.trim()).filter(Boolean)
					: Array.isArray(eventForm.tags)
						? eventForm.tags.flat().map(tag => tag.trim()).filter(Boolean)
						: [],
				requirements: eventForm.requirements
					? eventForm.requirements.split('\n').map(r => r.trim()).filter(Boolean)
					: [],
				socialLinks: {
					website: eventForm.socialLinks?.website || '',
					linkedin: eventForm.socialLinks?.linkedin || ''
				},
				audienceType: eventForm.audienceType || 'public',
				sessions: eventForm.sessions || [],
				features: {
					certificateEnabled: eventForm.certificateEnabled || false,
					chatEnabled: eventForm.chatEnabled || false
				}
			};
			
			const formData = new FormData();
			Object.keys(eventData).forEach(key => {
				const value = eventData[key];
				if (typeof value === 'object' && value !== null) {
					formData.append(key, JSON.stringify(value));
				} else if (value !== null && value !== undefined) {
					formData.append(key, value);
				}
			});
			
			if (eventForm.bannerImage instanceof File) formData.append('banner', eventForm.bannerImage);
			if (eventForm.logoImage instanceof File) formData.append('logo', eventForm.logoImage);

			const response = await createEventWithFiles(formData);
			if (response.success && response.event) {
				// Handle co-hosts nomination
				if (eventForm.cohosts.length > 0) {
					try {
						for (const email of eventForm.cohosts) {
							const userResult = await findUserByEmail(email);
							if (userResult.userId) {
								await nominateCoHost({ eventId: response.event._id, userId: userResult.userId });
							} else {
								console.warn(`Could not find user with email: ${email}`);
							}
						}
					} catch (cohostErr) {
						console.warn('Error nominating co-hosts:', cohostErr);
					}
				}
				
				// Call success callback
				if (onSuccess) onSuccess(response.event);
			} else {
				// Handle API error response
				const errorMessage = response.error || response.message || 'Failed to create event. Please try again.';
				alert(errorMessage);
			}
		} catch (err) {
			// Handle network or unexpected errors
			console.error('Error creating event:', err);
			const errorMessage = err?.response?.data?.error || err?.message || 'An unexpected error occurred. Please try again.';
			alert(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const renderStepContent = () => {
		switch (currentStep) {
			case 1:
				return (
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-purple-300 mb-2">Event Title *</label>
							<input 
								type="text" 
								name="title" 
								value={eventForm.title} 
								onChange={handleFormChange} 
								className={`w-full px-4 py-3 bg-transparent border rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 ${formErrors.title ? 'border-red-500' : 'border-purple-500'}`}
								placeholder="Enter your event title"
							/>
							{formErrors.title && <p className="text-red-400 text-sm mt-1">{formErrors.title}</p>}
						</div>
						<div>
							<label className="block text-sm font-medium text-purple-300 mb-2">Description *</label>
							<textarea 
								name="description" 
								value={eventForm.description} 
								onChange={handleFormChange} 
								rows={4} 
								className={`w-full px-4 py-3 bg-transparent border rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 ${formErrors.description ? 'border-red-500' : 'border-purple-500'}`}
								placeholder="Describe your event..."
							/>
							{formErrors.description && <p className="text-red-400 text-sm mt-1">{formErrors.description}</p>}
						</div>
						{/* About Event field removed as requested */}
						<div>
							<label className="block text-sm font-medium text-purple-300 mb-2">Event Date & Time *</label>
							<input 
								type="datetime-local" 
								name="date" 
								value={eventForm.date} 
								onChange={handleFormChange} 
								min={getMinDate()} 
								className={`w-full px-4 py-3 bg-transparent border rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 ${formErrors.date ? 'border-red-500' : 'border-purple-500'}`}
							/>
							{formErrors.date && <p className="text-red-400 text-sm mt-1">{formErrors.date}</p>}
						</div>
						<div>
							<label className="block text-sm font-medium text-purple-300 mb-2">Category</label>
							<select 
								name="category" 
								value={eventForm.category} 
								onChange={handleFormChange} 
								className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
							>
								<option value="" className="bg-gray-800">Select category</option>
								<option value="Technology" className="bg-gray-800">Technology</option>
								<option value="Programming" className="bg-gray-800">Programming</option>
								<option value="Cultural" className="bg-gray-800">Cultural</option>
								<option value="Academic" className="bg-gray-800">Academic</option>
								<option value="Sports" className="bg-gray-800">Sports</option>
								<option value="Workshop" className="bg-gray-800">Workshop</option>
								<option value="Seminar" className="bg-gray-800">Seminar</option>
								<option value="Conference" className="bg-gray-800">Conference</option>
							</select>
						</div>
					</div>
				);
			case 2:
				return (
					<div className="space-y-4">
						<h4 className="text-lg font-semibold text-purple-300 mb-4">👤 Organizer Information</h4>
						<div>
							<label className="block text-sm font-medium text-purple-300 mb-2">Organization Name (Optional)</label>
							<input 
								type="text" 
								name="organizationName" 
								value={eventForm.organizationName} 
								onChange={handleFormChange} 
								placeholder="e.g., Central University of Jharkhand, Tech Corp" 
								className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
							/>
							<p className="text-xs text-purple-300/70 mt-1">If organizing on behalf of an organization, enter its name here.</p>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-purple-300 mb-2">Contact Email</label>
								<input 
									type="email" 
									name="contactEmail" 
									value={eventForm.contactEmail} 
									readOnly 
									className="w-full px-4 py-3 bg-transparent border border-purple-500/50 rounded-lg text-purple-300 placeholder-purple-400 focus:outline-none cursor-not-allowed"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-purple-300 mb-2">Contact Phone</label>
								<input 
									type="text" 
									name="contactPhone" 
									value={eventForm.contactPhone} 
									readOnly 
									className="w-full px-4 py-3 bg-transparent border border-purple-500/50 rounded-lg text-purple-300 placeholder-purple-400 focus:outline-none cursor-not-allowed"
								/>
							</div>
						</div>
					</div>
				);
			case 3:
				return (
					<div className="space-y-4">
						<h4 className="text-lg font-semibold text-purple-300 mb-4">📍 Location & Audience</h4>
						<div>
							<label className="block text-sm font-medium text-purple-300 mb-2">Location Type *</label>
							<select 
								name="location" 
								value={eventForm.location} 
								onChange={handleFormChange} 
								className={`w-full px-4 py-3 bg-transparent border rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 ${formErrors.location ? 'border-red-500' : 'border-purple-500'}`}
							>
								<option value="" className="bg-gray-800">Select location type</option>
								<option value="online" className="bg-gray-800">🌐 Online</option>
								<option value="offline" className="bg-gray-800">🏢 Offline</option>
								<option value="hybrid" className="bg-gray-800">🔄 Hybrid</option>
							</select>
							{formErrors.location && <p className="text-red-400 text-sm mt-1">{formErrors.location}</p>}
						</div>
						{eventForm.location === 'offline' && (
							<div>
								<label className="block text-sm font-medium text-purple-300 mb-2">Venue *</label>
								<input 
									type="text" 
									name="venue" 
									value={eventForm.venue} 
									onChange={handleFormChange} 
									placeholder="Enter venue name" 
									className={`w-full px-4 py-3 bg-transparent border rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 ${formErrors.venue ? 'border-red-500' : 'border-purple-500'}`}
								/>
								{formErrors.venue && <p className="text-red-400 text-sm mt-1">{formErrors.venue}</p>}
							</div>
						)}
						{eventForm.location === 'online' && (
							<div>
								<label className="block text-sm font-medium text-purple-300 mb-2">Event Link *</label>
								<input 
									type="url" 
									name="eventLink" 
									value={eventForm.eventLink} 
									onChange={handleFormChange} 
									placeholder="https://..." 
									className={`w-full px-4 py-3 bg-transparent border rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 ${formErrors.eventLink ? 'border-red-500' : 'border-purple-500'}`}
								/>
								{formErrors.eventLink && <p className="text-red-400 text-sm mt-1">{formErrors.eventLink}</p>}
							</div>
						)}
						{eventForm.location === 'hybrid' && (
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-purple-300 mb-2">Venue *</label>
									<input 
										type="text" 
										name="venue" 
										value={eventForm.venue} 
										onChange={handleFormChange} 
										placeholder="Enter venue name" 
										className={`w-full px-4 py-3 bg-transparent border rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 ${formErrors.venue ? 'border-red-500' : 'border-purple-500'}`}
									/>
									{formErrors.venue && <p className="text-red-400 text-sm mt-1">{formErrors.venue}</p>}
								</div>
								<div>
									<label className="block text-sm font-medium text-purple-300 mb-2">Event Link *</label>
									<input 
										type="url" 
										name="eventLink" 
										value={eventForm.eventLink} 
										onChange={handleFormChange} 
										placeholder="https://..." 
										className={`w-full px-4 py-3 bg-transparent border rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 ${formErrors.eventLink ? 'border-red-500' : 'border-purple-500'}`}
									/>
									{formErrors.eventLink && <p className="text-red-400 text-sm mt-1">{formErrors.eventLink}</p>}
								</div>
							</div>
						)}
						<div>
							<label className="block text-sm font-medium text-purple-300 mb-2">Event Audience *</label>
							<select 
								name="audienceType" 
								value={eventForm.audienceType} 
								onChange={handleFormChange} 
								className={`w-full px-4 py-3 bg-transparent border rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 ${formErrors.audienceType ? 'border-red-500' : 'border-purple-500'}`}
							>
								<option value="" className="bg-gray-800">Select audience</option>
								<option value="institution" className="bg-gray-800">🏫 My Institution Only</option>
								<option value="public" className="bg-gray-800">🌍 Public (Anyone can join)</option>
							</select>
							{formErrors.audienceType && <p className="text-red-400 text-sm mt-1">{formErrors.audienceType}</p>}
						</div>
						<div>
							<label className="block text-sm font-medium text-purple-300 mb-2">Max Participants *</label>
							<input 
								type="number" 
								name="maxParticipants" 
								value={eventForm.maxParticipants} 
								onChange={handleFormChange} 
								min="1" 
								required
								placeholder="Enter maximum number of participants"
								className={`w-full px-4 py-3 bg-transparent border rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 ${formErrors.maxParticipants ? 'border-red-500' : 'border-purple-500'}`}
							/>
							{formErrors.maxParticipants && <p className="text-red-400 text-sm mt-1">{formErrors.maxParticipants}</p>}
						</div>
					</div>
				);
			case 4:
				return (
					<div className="space-y-4">
						<h4 className="text-lg font-semibold text-purple-300 mb-4">⚙️ Event Details & Features</h4>
						<div>
							<label className="block text-sm font-medium text-purple-300 mb-3">Event Type</label>
							<div className="flex items-center gap-6 mb-4">
								<label className="flex items-center cursor-pointer">
									<input 
										type="radio" 
										name="isPaid" 
										value="false" 
										checked={!eventForm.isPaid} 
										onChange={() => setEventForm(prev => ({ ...prev, isPaid: false, fee: '' }))} 
										className="mr-2 text-purple-500 focus:ring-purple-400"
									/>
									<span className="text-white">🆓 Free Event</span>
								</label>
								<label className="flex items-center cursor-pointer">
									<input 
										type="radio" 
										name="isPaid" 
										value="true" 
										checked={eventForm.isPaid} 
										onChange={() => setEventForm(prev => ({ ...prev, isPaid: true }))} 
										className="mr-2 text-purple-500 focus:ring-purple-400"
									/>
									<span className="text-white">💰 Paid Event</span>
								</label>
							</div>
							{eventForm.isPaid && (
								<div className="mb-4">
									<label className="block text-sm font-medium text-purple-300 mb-2">Registration Fee (₹) *</label>
									<input 
										type="number" 
										name="fee" 
										value={eventForm.fee} 
										onChange={handleFormChange} 
										min="1" 
										step="0.01" 
										placeholder="Enter amount" 
										className={`w-full px-4 py-3 bg-transparent border rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 ${formErrors.fee ? 'border-red-500' : 'border-purple-500'}`}
									/>
									{formErrors.fee && <p className="text-red-400 text-sm mt-1">{formErrors.fee}</p>}
								</div>
							)}
						</div>
						<div>
							<label className="block text-sm font-medium text-purple-300 mb-2">Tags (comma-separated)</label>
							<input 
								type="text" 
								name="tags" 
								value={eventForm.tags} 
								onChange={handleFormChange} 
								placeholder="e.g., Technology, AI, Innovation" 
								className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-purple-300 mb-2">Requirements (one per line)</label>
							<textarea 
								name="requirements" 
								value={eventForm.requirements} 
								onChange={handleFormChange} 
								rows={3} 
								placeholder="List any requirements or prerequisites" 
								className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-purple-300 mb-2">Sessions/Agenda</label>
							<div className="space-y-2">
								<div className="grid grid-cols-3 gap-2">
									<input 
										type="text" 
										value={sessionInput.title}
										onChange={(e) => setSessionInput(prev => ({ ...prev, title: e.target.value }))}
										placeholder="Session Title" 
										className="px-3 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none text-sm"
									/>
									<input 
										type="time" 
										value={sessionInput.time}
										onChange={(e) => setSessionInput(prev => ({ ...prev, time: e.target.value }))}
										placeholder="Time" 
										className="px-3 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none text-sm"
									/>
									<input 
										type="text" 
										value={sessionInput.speaker}
										onChange={(e) => setSessionInput(prev => ({ ...prev, speaker: e.target.value }))}
										placeholder="Speaker Name" 
										className="px-3 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none text-sm"
									/>
								</div>
								<button 
									type="button" 
									onClick={handleAddSession} 
									className="px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
								>
									+ Add Session
								</button>
								{eventForm.sessions.length > 0 && (
									<div className="space-y-2 mt-3">
										{eventForm.sessions.map((session, idx) => (
											<div key={idx} className="flex items-center justify-between bg-purple-900/30 px-3 py-2 rounded-lg">
												<div className="text-purple-200 text-sm">
													<span className="font-medium">{session.title}</span> • {session.time} • {session.speaker}
												</div>
												<button 
													type="button" 
													onClick={() => handleRemoveSession(idx)} 
													className="text-red-400 hover:text-red-300 text-sm"
												>
													Remove
												</button>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="flex items-center gap-3">
								<input 
									type="checkbox" 
									name="certificateEnabled" 
									checked={eventForm.certificateEnabled} 
									disabled
									className="w-4 h-4 text-purple-600 bg-transparent border-purple-500 rounded focus:ring-purple-500"
								/>
								<label className="text-sm font-medium text-purple-300">🏆 Enable Certificates (coming soon...)</label>
							</div>
							<div className="flex items-center gap-3">
								<input 
									type="checkbox" 
									name="chatEnabled" 
									checked={eventForm.chatEnabled} 
									onChange={(e) => setEventForm(prev => ({ ...prev, chatEnabled: e.target.checked }))}
									className="w-4 h-4 text-purple-600 bg-transparent border-purple-500 rounded focus:ring-purple-500"
								/>
								<label className="text-sm font-medium text-purple-300">💬 Enable Chat System</label>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-purple-300 mb-2">Website</label>
								<input 
									type="url" 
									name="socialLinks.website" 
									value={eventForm.socialLinks.website} 
									onChange={handleFormChange} 
									placeholder="https://example.com" 
									className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-purple-300 mb-2">LinkedIn</label>
								<input 
									type="url" 
									name="socialLinks.linkedin" 
									value={eventForm.socialLinks.linkedin} 
									onChange={handleFormChange} 
									placeholder="https://linkedin.com/in/event" 
									className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
								/>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-purple-300 mb-2">Co-hosts (Emails)</label>
							<div className="flex gap-2 mb-2">
								<input 
									type="text" 
									name="cohostInput" 
									value={cohostInput} 
									onChange={handleFormChange} 
									placeholder="Enter co-host email" 
									className="flex-1 px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none"
								/>
								<button 
									type="button" 
									onClick={handleAddCohost} 
									className="px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-600 transition-colors"
								>
									Add
								</button>
							</div>
							{eventForm.cohosts.length > 0 && (
								<div className="space-y-1">
									{eventForm.cohosts.map((email, idx) => (
										<div key={email+idx} className="flex items-center justify-between bg-purple-900/30 px-3 py-2 rounded-lg">
											<span className="text-purple-200">{email}</span>
											<button 
												type="button" 
												onClick={() => handleRemoveCohost(idx)} 
												className="text-red-400 hover:text-red-300 text-sm"
											>
												Remove
											</button>
										</div>
									))}
								</div>
							)}
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-purple-300 mb-2">Event Banner Image</label>
								<input 
									type="file" 
									name="bannerImage" 
									onChange={handleFormChange} 
									accept="image/*" 
									className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-700 file:text-white hover:file:bg-purple-600"
								/>
								{bannerUrl && (
									<div className="mt-2 w-full h-24 bg-black/40 rounded-lg flex items-center justify-center overflow-hidden border border-purple-500/30">
										<img src={bannerUrl} alt="Banner Preview" className="object-cover w-full h-full" />
									</div>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-purple-300 mb-2">Event Logo Image</label>
								<input 
									type="file" 
									name="logoImage" 
									onChange={handleFormChange} 
									accept="image/*" 
									className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-700 file:text-white hover:file:bg-purple-600"
								/>
								{logoUrl && (
									<div className="mt-2 flex items-center justify-center">
										<img src={logoUrl} alt="Logo Preview" className="object-cover w-16 h-16 rounded-full border-2 border-purple-500/50" />
									</div>
								)}
							</div>
						</div>
					</div>
				);
			default:
				return null;
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<div className="relative w-full max-w-4xl p-8 bg-[rgba(21,23,41,0.85)] border border-purple-600 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden">
				<div className="flex justify-between items-center mb-6">
					<div>
						<h3 className="text-2xl font-bold text-white">Create New Event</h3>
						<div className="flex items-center mt-2 space-x-2">
							{[1, 2, 3, 4].map((step) => (
								<div key={step} className="flex items-center">
									<div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
										currentStep === step 
											? 'bg-purple-600 text-white' 
											: currentStep > step 
												? 'bg-green-600 text-white' 
												: 'bg-purple-900 text-purple-300'
									}`}>
										{currentStep > step ? '✓' : step}
									</div>
									{step < 4 && <div className={`w-8 h-1 ${currentStep > step ? 'bg-green-600' : 'bg-purple-900'}`} />}
								</div>
							))}
						</div>
					</div>
					{onClose && (
						<button onClick={onClose} className="text-purple-300 hover:text-white text-2xl transition-colors">×</button>
					)}
				</div>
				<div className="max-h-[70vh] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#9b5de5 rgba(255,255,255,0.1)' }}>
					<form onSubmit={handleSubmit} className="space-y-6">
						{renderStepContent()}
						
						{/* Navigation Buttons */}
						<div className="flex justify-between pt-6 border-t border-purple-600/30">
							<button 
								type="button" 
								onClick={prevStep} 
								disabled={currentStep === 1}
								className="px-6 py-3 border border-purple-500/50 text-purple-300 rounded-full font-medium transition-colors hover:bg-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								← Previous
							</button>
							<div className="flex gap-3">
								{currentStep < 4 ? (
									<button 
										type="button" 
										onClick={nextStep}
										className="px-6 py-3 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-full transition-colors"
									>
										Next →
									</button>
								) : (
									<button 
										type="submit" 
										disabled={loading} 
										className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{loading ? 'Creating...' : '🚀 Create Event'}
									</button>
								)}
							</div>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

export default CreateEventForm;
