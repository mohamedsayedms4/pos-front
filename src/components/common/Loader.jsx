import React from 'react';

/**
 * Windows 8 Style Metro Loader (Orbiting Dots)
 */
const Loader = ({ size = '32px', color = 'var(--metro-blue)', message }) => {
  return (
    <div className="metro-loading-container" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '40px',
      gap: '20px'
    }}>
      <div className="spinner" style={{ 
        '--spinner-size': size, 
        color: color 
      }}>
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
      {message && (
        <p style={{ 
          fontSize: '0.9rem', 
          color: 'var(--text-muted)', 
          fontWeight: 300,
          letterSpacing: '0.5px'
        }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default Loader;
