import React, { useState, useEffect } from 'react';

interface CountDownTimerProps {
  start: number; // seconds
}

const CountDownTimer: React.FC<CountDownTimerProps> = ({ start }) => {
  const [seconds, setSeconds] = useState(start);

  useEffect(() => {
    setSeconds(start);
  }, [start]);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <p className="text-sm text-gray-500 text-center">
      {seconds > 0
        ? `OTP expires in ${minutes}:${secs.toString().padStart(2, '0')}`
        : 'OTP has expired. Please request a new one.'}
    </p>
  );
};

export default CountDownTimer;
