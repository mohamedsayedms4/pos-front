import React, { useState, useEffect } from 'react';
import Api from '../../services/api';
import { useBranch } from '../../context/BranchContext';
import '../../styles/pages/FooterInfoBar.css';
import logo2 from '../../assets/img/logo2.png';

const FooterInfoBar = () => {
  const { getSelectedBranch, branches } = useBranch();
  const [config, setConfig] = useState({
    softwareName: 'نظام بسيط ERP',
    supportPhone: '+201281018810',
    facebookUrl: 'https://facebook.com',
    linkedInUrl: 'https://linkedin.com',
    youtubeUrl: 'https://youtube.com',
    logoUrl: ''
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await Api.getGlobalConfig();
        if (data) {
          setConfig({
            softwareName: data.softwareName || 'نظام بسيط ERP',
            supportPhone: data.supportPhone || '+201281018810',
            facebookUrl: data.facebookUrl || 'https://facebook.com',
            linkedInUrl: data.linkedInUrl || 'https://linkedin.com',
            youtubeUrl: data.youtubeUrl || 'https://youtube.com',
            logoUrl: data.logoUrl ? Api.getImageUrl(data.logoUrl) : ''
          });
        }
      } catch (err) {
        console.error("Error loading footer config:", err);
      }
    };
    fetchConfig();
  }, []);

  const getArabicDate = () => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = new Date().toLocaleDateString('ar-EG', options);
    // Convert numbers to Arabic or keep them clean - standard Arabic formatting
    return dateStr;
  };

  const currentBranch = getSelectedBranch();
  const branchName = currentBranch ? currentBranch.name : (branches && branches.length > 0 ? branches[0].name : 'الفرع الرئيسي');

  return (
    <footer className="footer-info-bar">
      <div className="footer-container">
        
        {/* Right side: Brand and Icon */}
        <div className="footer-brand">
          <div className="brand-logo" style={{ background: 'transparent' }}>
            <img 
              src={config.logoUrl || logo2} 
              alt="Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'inherit' }} 
              onError={() => {
                if (config.logoUrl && config.logoUrl !== logo2) {
                  setConfig(prev => ({ ...prev, logoUrl: '' }));
                }
              }}
            />
          </div>
          <span className="brand-text">{config.softwareName}</span>
        </div>

        {/* Center: Support, Date and Branch */}
        <div className="footer-details">
          
          {/* Support */}
          <a href={`https://wa.me/${config.supportPhone ? config.supportPhone.replace(/\\D/g, '') : ''}`} target="_blank" rel="noopener noreferrer" className="detail-item support-item" style={{textDecoration: 'none'}}>
            <span className="detail-icon">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </span>
            <span className="detail-label">للدعم الفني :</span>
            <span className="detail-value">{config.supportPhone}</span>
          </a>

          {/* Date */}
          <div className="detail-item date-item">
            <span className="detail-icon">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </span>
            <span className="detail-label">تاريخ اليوم :</span>
            <span className="detail-value">{getArabicDate()}</span>
          </div>

          {/* Branch */}
          <div className="detail-item branch-item">
            <span className="detail-icon">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </span>
            <span className="detail-label">الفرع :</span>
            <span className="detail-value branch-highlight">{branchName}</span>
          </div>

        </div>

        {/* Left side: Social Links */}
        <div className="footer-socials">
          
          {/* Facebook */}
          {config.facebookUrl && (
            <a href={config.facebookUrl} target="_blank" rel="noopener noreferrer" className="social-icon-btn facebook-icon" title="فيسبوك">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
          )}

          {/* LinkedIn */}
          {config.linkedInUrl && (
            <a href={config.linkedInUrl} target="_blank" rel="noopener noreferrer" className="social-icon-btn linkedin" title="لينكد إن">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          )}

          {/* YouTube */}
          {config.youtubeUrl && (
            <a href={config.youtubeUrl} target="_blank" rel="noopener noreferrer" className="social-icon-btn youtube" title="يوتيوب">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.528 3.545 12 3.545 12 3.545s-7.528 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.022 0 12 0 12s0 3.978.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.86.508 9.388.508 9.388.508s7.528 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.978 24 12 24 12s0-3.978-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
          )}

        </div>

      </div>
    </footer>
  );
};

export default FooterInfoBar;
