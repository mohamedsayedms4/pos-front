import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import Api from '../services/api';
import '../styles/pages/Onboarding.css';

const OnboardingDashboard = ({ status, reloadStatus }) => {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  
  const [isSkippingBranch, setIsSkippingBranch] = useState(false);

  useEffect(() => {
    document.body.classList.add('onboarding-active');
    const handleResize = () => {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.classList.remove('onboarding-active');
    };
  }, []);

  useEffect(() => {
    if (status && status.completed) {
      setShowConfetti(true);
      setTimeout(() => {
        reloadStatus(); // Will unmount this component since completed is true
      }, 5000); // Wait 5 seconds to show confetti before hiding
    }
  }, [status, reloadStatus]);

  if (!status) return null;

  const percentage = status.completionPercentage;
  
  const steps = [
    {
      id: 1,
      title: 'أضف بيانات الشركة (10%)',
      desc: 'أدخل معلومات متجرك الأساسية',
      completed: status.hasCompanyDetails,
      action: () => navigate('/settings'),
      icon: '🏢',
      isLocked: false,
    },
    {
      id: 2,
      title: 'أضف أول فرع (25%)',
      desc: 'قم بإنشاء فرعك الأول لبدء العمل',
      completed: status.hasBranch,
      action: () => navigate('/branches'),
      icon: '🏪',
      isLocked: !status.hasCompanyDetails,
    },
    {
      id: 3,
      title: 'أضف أول منتج (50%)',
      desc: 'أضف منتجاتك لبيعها',
      completed: status.hasProduct,
      action: () => navigate('/products'),
      icon: '📦',
      isLocked: !status.hasCompanyDetails || !status.hasBranch,
    },
    {
      id: 4,
      title: 'اعمل أول فاتورة (75%)',
      desc: 'سجل أول عملية بيع لك',
      completed: status.hasInvoice,
      action: () => navigate('/pos'),
      icon: '🧾',
      isLocked: !status.hasCompanyDetails || !status.hasBranch || !status.hasProduct,
    },
    {
      id: 5,
      title: 'مبروك، أنت جاهز للبيع! 🎉 (100%)',
      desc: 'اكتملت جميع الخطوات',
      completed: status.completed,
      action: null,
      icon: '🎉',
      isLocked: true,
    }
  ];

  return (
    <div className="onboarding-wrapper">
      {showConfetti && <Confetti width={windowDimensions.width} height={windowDimensions.height} />}
      <div className="onboarding-card">
        <div className="onboarding-header">
          <h2>مرحباً بك! دعنا نجهز متجرك للعمل 🚀</h2>
          <p>أكمل الخطوات التالية لتبدأ البيع بنجاح.</p>
        </div>

        <div className="progress-container">
          <div className="progress-bar-wrapper">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${percentage}%`, background: percentage === 100 ? '#10b981' : 'var(--metro-indigo, #6A00FF)' }}
            ></div>
          </div>
          <span className="progress-text">{percentage}%</span>
        </div>

        <div className="checklist-container">
          {steps.map((step) => (
            <div 
              key={step.id} 
              id={`step-row-${step.id}`}
              className={`checklist-item ${step.completed ? 'completed' : 'pending'}`}
              style={step.isLocked ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              onClick={!step.completed && step.action && !step.isLocked ? step.action : undefined}
            >
              <div className="check-icon">
                {step.completed ? <i className="fas fa-check-circle"></i> : <i className="far fa-circle"></i>}
              </div>
              <div className="step-content">
                <h4 className="step-title">{step.icon} {step.title}</h4>
                <p className="step-desc">
                  {step.id === 2 && !step.completed 
                    ? 'الفرع الرئيسي مضاف بالفعل! هل تريد إضافة فرع آخر أم تخطي؟'
                    : step.desc}
                </p>
              </div>
              {!step.completed && step.action && step.id !== 2 && (
                <button 
                  className="step-action-btn" 
                  onClick={(e) => { e.stopPropagation(); step.action(); }}
                  disabled={step.isLocked}
                  style={step.isLocked ? { background: '#e2e8f0', color: '#94a3b8', cursor: 'not-allowed', border: 'none' } : {}}
                >
                  {step.isLocked ? '🔒 مغلق' : 'ابدأ الآن'}
                </button>
              )}
              {step.id === 2 && !step.completed && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    className="step-action-btn" 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      navigate('/branches/add'); 
                    }}
                    disabled={step.isLocked}
                    style={step.isLocked ? { background: '#e2e8f0', color: '#94a3b8', cursor: 'not-allowed', border: 'none' } : {}}
                  >
                    {step.isLocked ? '🔒 مغلق' : 'إضافة فرع آخر'}
                  </button>
                  {!step.isLocked && (
                    <button className="step-action-btn" disabled={isSkippingBranch} style={{ background: 'transparent', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }} onClick={async (e) => { 
                        e.stopPropagation(); 
                        setIsSkippingBranch(true);
                        try {
                            await Api._request('/onboarding/step/branch', { method: 'POST' });
                            reloadStatus();
                        } catch(err) {
                            console.error(err);
                        } finally {
                            setIsSkippingBranch(false);
                        }
                    }}>
                      {isSkippingBranch ? 'جاري التخطي...' : 'تخطي'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OnboardingDashboard;
