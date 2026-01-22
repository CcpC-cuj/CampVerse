import React, { useEffect, useRef, useState } from 'react';
import api from '../api/axiosInstance';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
import { useModal } from '../components/Modal';

export default function CertificateTemplateManagement() {
  const toast = useToast();
  const { showDanger, showSuccess, showError } = useModal();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  
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
      const response = await api.get('/api/admin/certificate-templates');
      setTemplates(response.data.templates || []);
      setError('');
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Failed to load templates';
      setError(`Failed to load templates: ${message}`);
      toast.error('Failed to load templates.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!templateFile || !formData.name || !formData.type) {
      setError('Please fill all required fields and select a template file');
      toast.warning('Please complete all required fields.');
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

      const response = await api.post('/api/admin/certificate-templates', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const data = response.data;
      setSuccess(`Template "${data.template.name}" uploaded successfully!`);
      toast.success('Template uploaded successfully!');
      setShowUploadForm(false);
      setFormData({ name: '', type: 'participation' });
      setTemplateFile(null);
      setPreviewFile(null);
      setPreviewUrl('');
      fetchTemplates();
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Upload failed';
      setError(message);
      toast.error('Failed to upload template.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (templateId, templateName) => {
    const confirmed = await showDanger(`Delete "${templateName}"? This cannot be undone.`, {
      confirmText: 'Delete Template',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/api/admin/certificate-templates/${templateId}`);
      setSuccess(`Template "${templateName}" deleted successfully!`);
      await showSuccess('Template deleted successfully!');
      fetchTemplates();
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Delete failed';
      setError(message);
      await showError('Failed to delete template.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setTemplateFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const stats = {
    total: templates.length,
    participation: templates.filter((t) => t.type === 'participation').length,
    achievement: templates.filter((t) => t.type === 'achievement').length,
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesQuery =
      template.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.type?.toLowerCase().includes(searchQuery.toLowerCase());

    const isUserUploaded = template.uploadedBy !== 'system';

    if (typeFilter === 'all') return matchesQuery && isUserUploaded;
    return matchesQuery && template.type === typeFilter && isUserUploaded;
  });

  return (
    <Layout title="Certificate Templates">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4">
            <p className="text-sm text-gray-400">Total Templates</p>
            <p className="text-3xl font-semibold text-white mt-1">{stats.total}</p>
          </div>
          <div className="bg-gray-800/60 border border-blue-500/30 rounded-xl p-4">
            <p className="text-sm text-blue-300">Participation</p>
            <p className="text-3xl font-semibold text-white mt-1">{stats.participation}</p>
          </div>
          <div className="bg-gray-800/60 border border-amber-500/30 rounded-xl p-4">
            <p className="text-sm text-amber-300">Achievement</p>
            <p className="text-3xl font-semibold text-white mt-1">{stats.achievement}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="participation">Participation</option>
            <option value="achievement">Achievement</option>
          </select>
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
        ) : filteredTemplates.length === 0 ? (
          <div className="bg-gray-800/60 rounded-xl p-12 text-center border border-gray-700/40">
            <i className="ri-file-list-3-line text-6xl text-gray-600 mb-4" />
            <p className="text-gray-400">No templates found</p>
            <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-gray-800/60 rounded-xl border border-gray-700/40 overflow-hidden hover:border-purple-500/50 transition-colors"
              >
                <div className="aspect-16/11 bg-gray-900 relative">
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
