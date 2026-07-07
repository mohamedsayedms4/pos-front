import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Api from '../services/api';
import { useGlobalUI } from '../components/common/GlobalUI';
import Loader from '../components/common/Loader';
import { Joyride, STATUS } from 'react-joyride';

const AutoStartBeacon = () => {
    const beaconRef = useRef(null);
    useEffect(() => {
        if (beaconRef.current && beaconRef.current.parentElement) {
            beaconRef.current.parentElement.click();
        }
    }, []);
    return <span ref={beaconRef} style={{ display: 'none' }} />;
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
    const onboardingStr = localStorage.getItem('onboardingStatus');
    if (onboardingStr) {
        try {
            const statusObj = JSON.parse(onboardingStr);
            if (!statusObj.hasBranch && !localStorage.getItem('tour_branch_form_v3')) {
                setTimeout(() => {
                    setRunTour(true);
                    localStorage.setItem('tour_branch_form_v3', 'true');
                }, 500); 
            }
        } catch(e) {}
    }
  }, []);

  const handleJoyrideCallback = (data) => {
      const { status } = data;
      const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
      
      if (finishedStatuses.includes(status)) {
          setRunTour(false);
          localStorage.setItem('tour_branch_form_v3', 'true');
      }
  };

  const tourSteps = [
      {
          target: '.tour-branch-code',
          content: 'أدخل كوداً مميزاً للفرع (مثال: BR-01).',
          disableBeacon: true,
          placement: 'bottom',
      },
      {
          target: '.tour-branch-name',
          content: 'أدخل اسم الفرع (مثال: الفرع الرئيسي).',
          disableBeacon: true,
          placement: 'bottom',
      },
      {
          target: '.tour-branch-save',
          content: 'اضغط هنا لحفظ الفرع بنجاح!',
          disableBeacon: true,
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
          beaconComponent={AutoStartBeacon}
          continuous={true}
          showProgress={true}
          showSkipButton={true}
          disableOverlayClose={true}
          spotlightClicks={true}
          callback={handleJoyrideCallback}
          styles={{
            options: {
              primaryColor: '#6A00FF',
              backgroundColor: 'var(--bg-card, #ffffff)',
              textColor: 'var(--text-main, #333333)',
              arrowColor: 'var(--bg-card, #ffffff)',
              zIndex: 1000,
            },
            tooltipContainer: { textAlign: 'right' },
            buttonNext: { outline: 'none', fontFamily: 'Cairo, sans-serif', padding: '6px 16px', borderRadius: '6px' },
            buttonBack: { marginLeft: 15, marginRight: 0, outline: 'none', fontFamily: 'Cairo, sans-serif', color: 'var(--text-muted, #666)' }
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
