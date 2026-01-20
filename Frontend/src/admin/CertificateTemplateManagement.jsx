import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';

const API_BASE = import.meta.env.VITE_API_URL || 'https://imkrish-campverse-backend.hf.space';

export default function CertificateTemplateManagement() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Upload form state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'participation' });
  const [templateFile, setTemplateFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/admin/certificate-templates`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch templates');
      
      const data = await response.json();
      setTemplates(data.templates || []);
      setError('');
    } catch (err) {
      setError('Failed to load templates: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!templateFile || !formData.name || !formData.type) {
      setError('Please fill all required fields and select a template file');
      return;
    }

    try {
      setUploading(true);
      setError('');
      
      const form = new FormData();
      form.append('template', templateFile);
      if (previewFile) form.append('preview', previewFile);
      form.append('name', formData.name);
      form.append('type', formData.type);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/admin/certificate-templates`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: form
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload template');
      }

      const data = await response.json();
      setSuccess(`Template "${data.template.name}" uploaded successfully!`);
      setShowUploadForm(false);
      setFormData({ name: '', type: 'participation' });
      setTemplateFile(null);
      setPreviewFile(null);
      setPreviewUrl('');
      fetchTemplates();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (templateId, templateName) => {
    if (!confirm(`Are you sure you want to delete "${templateName}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/admin/certificate-templates/${templateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete template');
      }

      setSuccess(`Template "${templateName}" deleted successfully!`);
      fetchTemplates();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setTemplateFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  return (
    <Layout title="Certificate Templates">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Certificate Templates</h1>
            <p className="text-gray-400 text-sm">Manage templates available for event certificates</p>
          </div>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 flex items-center gap-2"
          >
            <i className="ri-add-line" />
            {showUploadForm ? 'Cancel' : 'Upload Template'}
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-900/40 border border-red-500/50 rounded-lg p-4 text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/40 border border-green-500/50 rounded-lg p-4 text-green-300">
            {success}
          </div>
        )}

        {/* Upload Form */}
        {showUploadForm && (
          <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/40">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <i className="ri-upload-cloud-line text-purple-400" />
              Upload New Template
            </h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Template Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    placeholder="e.g., Modern Blue"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    required
                  >
                    <option value="participation">Participation</option>
                    <option value="achievement">Achievement</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Template Image (PNG/JPG) *</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 transition-colors"
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded" />
                  ) : (
                    <div className="text-gray-400">
                      <i className="ri-image-add-line text-4xl mb-2" />
                      <p>Click to select template image</p>
                      <p className="text-xs">Recommended: 2480 x 1754 pixels (A4 landscape)</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <i className="ri-upload-line" />
                      Upload Template
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Templates Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <i className="ri-loader-4-line animate-spin text-4xl text-purple-400" />
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-gray-800/60 rounded-xl p-12 text-center border border-gray-700/40">
            <i className="ri-file-list-3-line text-6xl text-gray-600 mb-4" />
            <p className="text-gray-400">No templates available</p>
            <p className="text-sm text-gray-500">Upload your first certificate template to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-gray-800/60 rounded-xl border border-gray-700/40 overflow-hidden hover:border-purple-500/50 transition-colors"
              >
                <div className="aspect-[16/11] bg-gray-900 relative">
                  <img
                    src={template.preview || template.url}
                    alt={template.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x280?text=Template';
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      template.type === 'participation' 
                        ? 'bg-blue-500/20 text-blue-300' 
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {template.type}
                    </span>
                  </div>
                  {template.uploadedBy === 'system' && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 rounded text-xs bg-gray-700/80 text-gray-300">
                        System
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-white font-medium mb-1">{template.name}</h3>
                  <p className="text-gray-400 text-sm mb-3">
                    Added {new Date(template.uploadedAt).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <a
                      href={template.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-center text-sm hover:bg-gray-600"
                    >
                      <i className="ri-eye-line mr-1" />
                      Preview
                    </a>
                    {template.uploadedBy !== 'system' && (
                      <button
                        onClick={() => handleDelete(template.id, template.name)}
                        className="px-3 py-2 bg-red-900/50 text-red-300 rounded-lg text-sm hover:bg-red-900"
                      >
                        <i className="ri-delete-bin-line" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
