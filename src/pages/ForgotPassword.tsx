
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Lock } from 'lucide-react';
import { forgotPassword, verifyOtp, resetPassword } from '../api/forgotpassword/forgotPassword';
import CountDownTimer from './CountDownTimer';


const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState<'email' | 'otp' | 'password' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      const response = await forgotPassword(email);
      console.log("Forgot password response:", response);
      
      if (response.status === 'success') {
        setStep('otp');
      } else {
        setError(response.message || 'Failed to send OTP. Please try again.');
      }
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!otp.match(/^\d{6}$/)) {
      setError('Please enter a valid 6-digit OTP.');
      setLoading(false);
      return;
    }

    try {
      const response = await verifyOtp(email, otp);
      if (response.status === 'success') {
        setStep('password');
      } else {
        setError(response.message || 'Invalid OTP. Please try again.');
      }
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const response = await resetPassword(email, newPassword, confirmPassword);
      if (response.status === 'success') {
        setStep('success');
      } else {
        setError(response.message || 'Failed to reset password. Please try again.');
      }
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
          <p className="text-gray-600 mt-2">
            {step === 'email' && 'Enter your email to reset your password.'}
            {step === 'otp' && 'Enter the 6-digit OTP sent to your email.'}
            {step === 'password' && 'Set your new password.'}
            {step === 'success' && 'Your password has been reset successfully.'}
          </p>
        </div>
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </Button>
            
            <div className="text-center mt-4">
              <Link to="/login" className="text-blue-600 text-sm hover:underline">Back to Login</Link>
            </div>
          </form>
        )}
        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            <Input
              label="OTP"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              required
              maxLength={6}
              disabled={loading}
            />
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <CountDownTimer start={60*5}  />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verifying OTP...' : 'Verify OTP'}
            </Button>
            
            <div className="text-center mt-4">
              <button type="button" className="text-blue-600 text-sm hover:underline bg-transparent" onClick={() => setStep('email')}>
                Change Email
              </button>
            </div>
          </form>
        )}
        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              disabled={loading}
            />
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              disabled={loading}
            />
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Changing Password...' : 'Change Password'}
            </Button>
          </form>
        )}
        {step === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-700">Your password has been reset successfully.</p>
            <Link to="/login">
              <Button className="w-full mt-4">Go to Login</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;