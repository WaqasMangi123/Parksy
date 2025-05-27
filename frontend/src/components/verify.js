import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function VerifyAccount() {
  const [error, setError] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const navigate = useNavigate();
  const { code } = useParams(); // Get the verification code from the URL

  useEffect(() => {
    // If there's a verification code, attempt to verify the account
    if (code) {
      handleVerification(code);
    }
  }, [code]);

  const handleVerification = async (verificationCode) => {
    try {
      // Send verification code to the backend for verification
      const response = await fetch(`http://localhost:3001/api/verify/${verificationCode}`, {
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid verification code or expired link');
      }

      if (data.success) {
        setIsVerified(true);
        setError(null);
        // Redirect to login page after successful verification
        setTimeout(() => navigate('/login'), 2000); // Optional redirect delay
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container">
      <h2>Verify Your Email</h2>
      {!isVerified ? (
        <div>
          <p>Verifying your account...</p>
          {error && <p className="error">{error}</p>}
        </div>
      ) : (
        <p>Your account has been verified successfully! Redirecting to login...</p>
      )}
    </div>
  );
}

export default VerifyAccount;