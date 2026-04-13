import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';

const EventBanner = forwardRef((_, ref) => {
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState(false);
  const timerRef = React.useRef(null);

  useImperativeHandle(ref, () => ({
    show(text) {
      setMsg(text);
      setVisible(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 2800);
    }
  }));

  return (
    <div className={`event-banner ${visible ? 'visible' : ''}`}>
      {msg}
    </div>
  );
});

export default EventBanner;
