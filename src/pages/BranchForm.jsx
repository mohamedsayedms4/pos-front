import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import { Joyride, STATUS } from 'react-joyride';

const StartTourBeacon = ({ beaconProps }) => {
    return (
        <>
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes pulseBeacon {
                    0% { transform: scale(1); box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4); }
                    50% { transform: scale(1.08); box-shadow: 0 12px 30px rgba(59, 130, 246, 0.7); }
                    100% { transform: scale(1); box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4); }
                }
            `}} />
            <button 
                {...beaconProps}
                style={{
                    background: '#0B1354',
                    color: '#ffffff',
                    border: '2px solid #3B82F6',
                    padding: '12px 24px',
                    fontSize: '1rem',
                    borderRadius: '30px',
                    fontFamily: 'Cairo, sans-serif',
                    fontWeight: '800',
                    cursor: 'pointer',
                    outline: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    position: 'relative',
                    zIndex: 9999,
                    animation: 'pulseBeacon 2s infinite ease-in-out',
                    boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)'
                }}
            >
                ابدأ الجولة الإرشادية للنظام
            </button>
        </>
    );
};

const BranchForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useGlobalUI();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [runTour, setRunTour] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    phone: '',
    type: 'RETAIL',
    active: true,
    treasuryLinkType: 'MANUAL'
  });

  useEffect(() => {
    if (id) {
      const fetchBranch = async () => {
        try {
          const res = await Api.getBranchesSummary();
          const branch = res.find(b => b.id === parseInt(id) || b.id === id);
          if (branch) {
            setFormData({
              code: branch.code || '',
              name: branch.name || '',
              address: branch.address || '',
              phone: branch.phone || '',
              type: branch.type || 'RETAIL',
              active: branch.active ?? true,
              treasuryLinkType: branch.treasuryLinkType || 'MANUAL'
            });
          }
        } catch (err) {
          toast(err.message, 'error');
        } finally {
          setLoading(false);
        }
      };
      fetchBranch();
    }
  }, [id]);

  useEffect(() => {
    const checkTour = async () => {
        let onboarding = null;
        const onboardingStr = localStorage.getItem('onboardingStatus');
        if (onboardingStr) {
            try { onboarding = JSON.parse(onboardingStr); } catch(e){}
        }
        
        if (!onboarding) {
            try {
                const res = await Api.get('/onboarding/status');
                onboarding = res.data || res;
                if (onboarding) {
                    localStorage.setItem('onboardingStatus', JSON.stringify(onboarding));
                }
            } catch(e){}
        }
        
        if (onboarding && (onboarding.hasBranch || onboarding.isCompleted || onboarding.completed)) {
            return;
        }

        if (!localStorage.getItem('tour_branch_form_v3')) {
            setTimeout(() => {
                setRunTour(true);
            }, 500); 
        }
    };
    checkTour();
  }, []);

  const handleJoyrideCallback = (data) => {
      const { status, type } = data;
      const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
      
      if (finishedStatuses.includes(status) || type === 'tour:end') {
          setRunTour(false);
          localStorage.setItem('tour_branch_form_v3', 'true');
      }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === '2') {
            e.preventDefault();
            setRunTour(false);
            localStorage.setItem('tour_branch_form_v3', 'true');
            toast('تم تخطي الجولة الإرشادية للنظام', 'info');
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toast]);

  const tourSteps = [
      {
          target: '.tour-branch-code',
          content: 'أدخل كوداً مميزاً للفرع (مثال: BR-01).',
          placement: 'bottom',
      },
      {
          target: '.tour-branch-name',
          content: 'أدخل اسم الفرع (مثال: الفرع الرئيسي).',
          placement: 'bottom',
      },
      {
          target: '.tour-branch-save',
          content: 'اضغط هنا لحفظ الفرع بنجاح!',
          placement: 'top',
      }
  ];

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (id) {
        await Api._request(`/branches/${id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        toast('تم تحديث الفرع بنجاح', 'success');
      } else {
        await Api._request('/branches', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        toast('تم إضافة الفرع بنجاح', 'success');
      }
      
      // Redirect to dashboard if in onboarding
      const onboardingStr = localStorage.getItem('onboardingStatus');
      if (onboardingStr) {
          const obs = JSON.parse(onboardingStr);
          if (!obs.completed) {
              navigate('/dashboard');
              return;
          }
      }
      navigate('/branches');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader message="جاري التحميل..." />;

  return (
    <div className="page-section" style={{ direction: 'rtl' }}>
      <Joyride
          steps={tourSteps}
          run={runTour}
          beaconComponent={StartTourBeacon}
          continuous={true}
          showProgress={true}
          showSkipButton={true}
          disableOverlayClose={true}
          spotlightClicks={true}
          callback={handleJoyrideCallback}
          styles={{
            options: {
              primaryColor: '#3B82F6',
              backgroundColor: '#0B1354',
              textColor: '#ffffff',
              arrowColor: '#0B1354',
              zIndex: 1000,
            },
            tooltipContainer: { textAlign: 'right' },
            buttonNext: { outline: 'none', backgroundColor: '#3B82F6', color: '#ffffff', fontFamily: 'Cairo, sans-serif', fontWeight: 'bold', padding: '6px 16px', borderRadius: '6px' },
            buttonBack: { marginLeft: 15, marginRight: 0, outline: 'none', fontFamily: 'Cairo, sans-serif', color: '#a0aec0' }
          }}
          locale={{ back: 'السابق', close: 'إغلاق', last: 'إنهاء', next: 'التالي', skip: 'تخطي' }}
      />
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{id ? 'تعديل بيانات الفرع' : 'إضافة فرع جديد'}</h3>
          <button className="btn btn-ghost" onClick={() => navigate('/branches')}>العودة</button>
        </div>
        <div className="card-body">
          <form id="branchForm" onSubmit={handleSave}>
            <div className="form-group tour-branch-code">
              <label>كود الفرع * (فريد)</label>
              <input className="form-control" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} required placeholder="مثال: BR-001" />
            </div>
            <div className="form-group tour-branch-name">
              <label>اسم الفرع *</label>
              <input className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>نوع الفرع</label>
              <select className="form-control" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="RETAIL">فرع تجزئة (بيع مباشر)</option>
                <option value="WAREHOUSE_ONLY">مخزن فقط</option>
                <option value="ONLINE">متجر إلكتروني</option>
              </select>
            </div>
            <div className="form-group">
              <label>العنوان</label>
              <input className="form-control" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="form-group">
              <label>الهاتف</label>
              <input className="form-control" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="form-group">
              <label>نظام ربط الخزينة</label>
              <select className="form-control" value={formData.treasuryLinkType} onChange={e => setFormData({...formData, treasuryLinkType: e.target.value})}>
                <option value="MANUAL">يدوي (يتم توريد المبالغ للمركزية يدوياً)</option>
                <option value="AUTOMATIC">تلقائي (تسميع فوري في الخزينة المركزية)</option>
              </select>
              <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                النظام التلقائي يعكس كل حركات الفرع في الخزينة الرئيسية لحظياً.
              </small>
            </div>
            <div className="form-group">
              <label>نشط</label>
              <label className="toggle-switch">
                <input type="checkbox" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button type="submit" form="branchForm" className="btn btn-primary tour-branch-save" disabled={saving}>
                {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => navigate('/branches')}>إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BranchForm;
