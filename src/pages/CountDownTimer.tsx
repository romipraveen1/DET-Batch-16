import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const  CountDownTimer =({ start = 10 }) => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(start);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  if(timeLeft === 0){
    navigate('/login');

  return <div>Time Left: {timeLeft}</div>;
}
}
export default CountDownTimer;
