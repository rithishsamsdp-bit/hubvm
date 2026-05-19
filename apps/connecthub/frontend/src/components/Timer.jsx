import { useEffect, useState, useRef } from "react";

const Timer = ({ startTime, stopped, paused, finalDuration }) => {
  const [elapsed, setElapsed] = useState(0);
  const pausedElapsed = useRef(0);

  useEffect(() => {
    const startTimeNum = typeof startTime === 'number' ? startTime : 
                         typeof startTime === 'string' ? parseInt(startTime, 10) : null;
    
    if (!startTimeNum || isNaN(startTimeNum)) {
      setElapsed(0);
      pausedElapsed.current = 0;
      return;
    }

    if (stopped) {
      if (finalDuration !== null && finalDuration !== undefined) {
        setElapsed(finalDuration);
      }
      return;
    }

    let interval;
    if (!paused) {
      const calculateElapsed = () => {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startTimeNum) / 1000);
        return Math.max(0, elapsedSeconds - pausedElapsed.current);
      };

      setElapsed(calculateElapsed());

      interval = setInterval(() => {
        setElapsed(calculateElapsed());
      }, 1000);
    } else {
      // When paused, don't update the timer
      // The elapsed state will remain at its current value
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [startTime, stopped, paused, finalDuration]);

  const formatTime = (seconds) => {
    if (seconds < 0) return "00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const hrsStr = String(hrs).padStart(2, "0");
    const minsStr = String(mins).padStart(2, "0");
    const secsStr = String(secs).padStart(2, "0");
    return `${hrsStr}:${minsStr}:${secsStr}`;
  };

  return <>{formatTime(elapsed)}</>;
};

export default Timer;
