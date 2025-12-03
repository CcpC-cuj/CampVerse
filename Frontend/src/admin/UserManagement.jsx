import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    }
    setLoading(false);
  };

  const handleUpdateRole = async (userId, roles) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/${userId}/roles`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roles })
      });
      if (res.ok) {
        alert('User roles updated successfully!');
        fetchUsers();
        setShowModal(false);
      } else {
        alert('Failed to update user roles');
      }
    } catch (err) {
      console.error('Error updating roles:', err);
      alert('Error updating user roles');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || 
                       (Array.isArray(user.roles) && user.roles.includes(roleFilter));
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role) => {
    const colors = {
      platformAdmin: 'bg-red-500/30 text-red-300 border-red-500/50',
      verifier: 'bg-blue-500/30 text-blue-300 border-blue-500/50',
      host: 'bg-green-500/30 text-green-300 border-green-500/50',
      user: 'bg-gray-500/30 text-gray-300 border-gray-500/50'
    };
    return colors[role] || colors.user;
  };

  return (
    <Layout title="User Management">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Search and Filter */}
        <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/40">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Roles</option>
              <option value="platformAdmin">Platform Admin</option>
              <option value="verifier">Verifier</option>
              <option value="host">Host</option>
              <option value="user">User</option>
            </select>
            <button
              onClick={fetchUsers}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors flex items-center gap-2"
            >
              <i className="ri-refresh-line" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/40">
            <p className="text-2xl font-bold text-white">{users.length}</p>
            <p className="text-sm text-gray-400">Total Users</p>
          </div>
          <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/40">
            <p className="text-2xl font-bold text-red-400">
              {users.filter(u => u.roles?.includes('platformAdmin')).length}
            </p>
            <p className="text-sm text-gray-400">Admins</p>
          </div>
          <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/40">
            <p className="text-2xl font-bold text-blue-400">
              {users.filter(u => u.roles?.includes('verifier')).length}
            </p>
            <p className="text-sm text-gray-400">Verifiers</p>
          </div>
          <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/40">
            <p className="text-2xl font-bold text-green-400">
              {users.filter(u => u.roles?.includes('host')).length}
            </p>
            <p className="text-sm text-gray-400">Hosts</p>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-gray-800/60 rounded-xl border border-gray-700/40 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <i className="ri-loader-4-line animate-spin text-3xl text-purple-500" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20">
              <i className="ri-user-search-line text-5xl text-gray-600 mb-4" />
              <p className="text-gray-400">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">User</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Email</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Roles</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {filteredUsers.map(user => (
                    <tr key={user._id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.profilePhoto || user.avatar || '/default-avatar.png'}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => { e.target.src = '/default-avatar.png'; }}
                          />
                          <div>
                            <p className="text-white font-medium">{user.name}</p>
                            <p className="text-gray-500 text-xs">ID: {user._id?.slice(-8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-300">{user.email}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(user.roles || ['user']).map(role => (
                            <span key={role} className={`px-2 py-0.5 rounded text-xs border ${getRoleBadge(role)}`}>
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${user.isVerified ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {user.isVerified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => { setSelectedUser(user); setShowModal(true); }}
                          className="px-3 py-1.5 bg-purple-600/30 text-purple-300 rounded hover:bg-purple-600/50 transition-colors text-sm"
                        >
                          <i className="ri-edit-line mr-1" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit User Modal */}
        {showModal && selectedUser && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Edit User Roles</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                  <i className="ri-close-line text-2xl" />
                </button>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={selectedUser.profilePhoto || '/default-avatar.png'}
                    alt={selectedUser.name}
                    className="w-12 h-12 rounded-full"
                    onError={(e) => { e.target.src = '/default-avatar.png'; }}
                  />
                  <div>
                    <p className="text-white font-medium">{selectedUser.name}</p>
                    <p className="text-gray-400 text-sm">{selectedUser.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-sm text-gray-400 mb-2">Assign Roles:</p>
                {['user', 'host', 'verifier', 'platformAdmin'].map(role => (
                  <label key={role} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-900">
                    <input
                      type="checkbox"
                      checked={selectedUser.roles?.includes(role)}
                      onChange={(e) => {
                        const newRoles = e.target.checked
                          ? [...(selectedUser.roles || []), role]
                          : (selectedUser.roles || []).filter(r => r !== role);
                        setSelectedUser({ ...selectedUser, roles: newRoles });
                      }}
                      className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                    />
                    <span className={`px-2 py-0.5 rounded text-xs border ${getRoleBadge(role)}`}>{role}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateRole(selectedUser._id, selectedUser.roles)}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
