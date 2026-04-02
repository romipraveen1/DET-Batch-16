import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import apiClient from '../lib/api';

interface ChangePasswordSectionProps {
  userId?: string;
}

const ChangePasswordSection: React.FC<ChangePasswordSectionProps> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.put('users/change-password', {
        currentPassword: oldPassword,
        newPassword: newPassword,
        confirmPassword: confirmPassword,
      });

      // Check if the response indicates success
      if (response.data && (response.data.status === 'success' || response.status === 200)) {
        setSuccess('Password changed successfully!');
        setShowForm(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(response.data?.message || 'Failed to change password');
      }
    } catch (error: any) {
      console.error('Change password error:', error);

      // Handle different types of errors
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.response?.status === 400) {
        setError('Invalid password or request. Please check your current password.');
      } else if (error.response?.status === 401) {
        setError('Authentication failed. Please login again.');
      } else if (error.message) {
        setError(error.message);
      } else {
        setError('Error changing password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!showForm ? (
        <Button variant="primary" size="sm" className="w-full" onClick={() => setShowForm(true)}>
          Change Password
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Old Password"
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2"
            placeholder="New Password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={loading}>
              {loading ? 'Changing...' : 'Submit'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

interface UserDetailsDrawerProps {
  user?: {
    userId?: string;
    username?: string;
    email?: string;
    role?: string;
  };
  onClose: () => void;
}

const UserDetailsDrawer: React.FC<UserDetailsDrawerProps> = ({ user, onClose }) => {
  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-[100] animate-slideIn flex flex-col border-l border-gray-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-blue-700">User Details</h2>
        <Button variant="ghost" size="sm" className="p-2 rounded-xl" onClick={onClose}>
          <span className="text-gray-500">✕</span>
        </Button>
      </div>
      <div className="px-6 py-6 flex-1 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            {/* User icon can go here */}
          </div>
          <div>
            <p className="text-xl font-semibold text-gray-900">{user?.username}</p>
            {/* <p className="text-sm text-gray-500 capitalize">{user?.role}</p> */}
          </div>
        </div>
        <div className="mt-4">
          {/* <p className="text-sm text-gray-700"><span className="font-semibold">Email:</span> {user?.email || 'N/A'}</p> */}
          <hr className="my-4" />
          <h3 className="text-md font-semibold text-gray-800 mb-2">Change Password</h3>
          <ChangePasswordSection userId={user?.userId} />
        </div>
      </div>
    </div>
  );
};

export default UserDetailsDrawer;
