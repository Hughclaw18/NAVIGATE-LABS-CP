import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { user, updatePassword } = useAuth();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    try {
      setError('');
      setSuccess('');
      setLoading(true);
      
      await updatePassword(newPassword);
      
      setSuccess('Password successfully updated');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Password update error:', err);
      setError('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <h1>Profile</h1>
      
      <div className="profile-card">
        <h2>Account Information</h2>
        
        <div className="profile-info">
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>User ID:</strong> {user.id}
          </p>
          <p>
            <strong>Email Verified:</strong> {user.email_confirmed_at ? 'Yes' : 'No'}
          </p>
        </div>
      </div>
      
      <div className="profile-card">
        <h2>Update Password</h2>
        
        {error && (
          <div className="alert alert-danger">{error}</div>
        )}
        
        {success && (
          <div className="alert alert-success">{success}</div>
        )}
        
        <form onSubmit={handlePasswordUpdate}>
          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <input
              type="password"
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-control"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirm-password">Confirm New Password</label>
            <input
              type="password"
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-control"
              required
            />
          </div>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile; 