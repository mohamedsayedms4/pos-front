import React, { useState, useEffect, useRef } from 'react';
import { useGlobalUI } from '../components/common/GlobalUI';

const AiAssistant = () => {
  const { toast } = useGlobalUI();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'أهلاً بك! أنا **مساعد سجل الذكي** 🤖، مستشارك الذكي المدمج بنظام **سجل** المدعوم بـ **DeepSeek**.\n\nيمكنني مساعدتك في:\n- 📊 كتابة خطط لزيادة مبيعاتك ونمو منشأتك.\n- 📝 صياغة أوصاف جذابة لمنتجاتك وخدماتك.\n- 💸 تقديم نصائح محاسبية دقيقة لتقليل الهوالك والمصروفات.\n- ✉️ صياغة مراسلات للموردين أو ردود على تذاكر الدعم الفني.',
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // DeepSeek Config State (saved in localStorage)
  const [apiKey, setApiKey] = useState(localStorage.getItem('deepseek_api_key') || '');
  const [model, setModel] = useState(localStorage.getItem('deepseek_model') || 'deepseek-chat');
  const [showConfig, setShowConfig] = useState(!localStorage.getItem('deepseek_api_key'));

  const messagesEndRef = useRef(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('deepseek_api_key', apiKey);
    localStorage.setItem('deepseek_model', model);
    setShowConfig(false);
    toast('تم حفظ إعدادات DeepSeek بنجاح! 🤖', 'success');
  };

  const handleClearChat = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في مسح سجل المحادثة الحالي؟')) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: 'تم بدء محادثة جديدة. كيف يمكنني مساعدتك في أعمالك اليوم؟ 🤖',
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const executeShortcut = (promptText) => {
    setInput(promptText);
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    // Check if API key is configured
    if (!apiKey) {
      setShowConfig(true);
      toast('الرجاء إدخال مفتاح API لـ DeepSeek للبدء 🔑', 'warning');
      return;
    }

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build API request payload
      const systemPrompt = {
        role: 'system',
        content: 'أنت "مساعد سجل الذكي"، مستشار أعمال خبير ومحاسب محترف مدمج في نظام إدارة المؤسسات "سجل". مهمتك الإجابة بلطف واحترافية وبلهجة ودية باللغة العربية، ومساعدة التجار في إدارة مخازنهم، تسعير المنتجات، زيادة المبيعات، صياغة مراسلات للموردين، وتقديم النصائح المحاسبية لنجاح منشأتهم.'
      };

      const chatHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [systemPrompt, ...chatHistory, { role: 'user', content: userMsg.content }],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `خطأ في الاتصال بالخادم: ${res.status}`);
      }

      const data = await res.json();
      const aiReply = data.choices[0]?.message?.content || 'عذراً، لم أتمكن من صياغة إجابة مناسبة حالياً.';

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiReply,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      }]);

    } catch (err) {
      console.error('DeepSeek connection error:', err);
      toast(err.message || 'فشل الاتصال بـ DeepSeek', 'error');
      
      // Fallback helpful mock response if key is wrong or server is offline
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ **تعذر الاتصال بـ DeepSeek**\n\nالرجاء التأكد من:\n1. صحة مفتاح الـ API المفعل في إعدادات المساعد بالأعلى 🔑\n2. وجود رصيد كافٍ في حساب DeepSeek الخاص بك.\n3. اتصال الإنترنت بجهازك.\n\n*ملاحظة: يمكنك إعداد مفتاح الـ API من زر "إعدادات الربط" بأعلى الشاشة.*`,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Simple Markdown parser for rich text renders
  const renderMessageContent = (text) => {
    if (!text) return '';
    return text.split('\n').map((line, idx) => {
      // Bold rendering
      let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Bullet list items
      if (formattedLine.startsWith('- ') || formattedLine.startsWith('* ')) {
        return <li key={idx} dangerouslySetInnerHTML={{ __html: formattedLine.substring(2) }} style={{ marginRight: '20px', listStyleType: 'disc' }} />;
      }
      return <p key={idx} dangerouslySetInnerHTML={{ __html: formattedLine }} style={{ margin: '6px 0' }} />;
    });
  };

  return (
    <div className="ai-assistant-container" style={{ direction: 'rtl', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header bar with controls */}
      <div className="ai-header-bar">
        <div className="ai-brand">
          <span className="ai-icon">🤖</span>
          <div>
            <h2>مساعد سجل الذكي</h2>
            <p>مساعد أعمالك الذكي المدعوم بـ DeepSeek AI</p>
          </div>
        </div>

        <div className="ai-actions">
          <button className="btn-ai-setup" onClick={() => setShowConfig(!showConfig)}>
            ⚙️ إعدادات الربط بـ DeepSeek
          </button>
          <button className="btn-ai-clear" onClick={handleClearChat}>
            🗑️ مسح المحادثة
          </button>
        </div>
      </div>

      {/* API Credentials Setup Panel */}
      {showConfig && (
        <div className="ai-setup-panel">
          <form onSubmit={saveConfig} className="ai-setup-form">
            <h3>🔑 ربط مفتاح API الخاص بـ DeepSeek</h3>
            <p>لربط منشأتك بالذكاء الاصطناعي، يرجى كتابة مفتاح الـ API الخاص بـ DeepSeek. يتم حفظ المفتاح محلياً بشكل آمن على متصفحك.</p>
            
            <div className="setup-fields-grid">
              <div className="form-group">
                <label>مفتاح API الخاص بـ DeepSeek (API Key)</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={apiKey} 
                  onChange={e => setApiKey(e.target.value)} 
                  placeholder="sk_prod_..." 
                  required
                />
              </div>

              <div className="form-group">
                <label>إصدار الموديل (Model)</label>
                <select className="form-control" value={model} onChange={e => setModel(e.target.value)}>
                  <option value="deepseek-chat">DeepSeek Chat (المحرك السريع - موصى به)</option>
                  <option value="deepseek-coder">DeepSeek Coder (المحرك البرمجي/المنطقي المتقدم)</option>
                </select>
              </div>
            </div>

            <div className="setup-form-actions">
              <button type="submit" className="btn btn-primary">حفظ وتفعيل الاتصال</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowConfig(false)}>إلغاء</button>
            </div>
            <small className="setup-help-link">
              💡 يمكنك توليد مفتاح الـ API من لوحة تحكم مطوري ديب سيك عبر الموقع: <a href="https://platform.deepseek.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--metro-blue)' }}>platform.deepseek.com</a>
            </small>
          </form>
        </div>
      )}

      {/* Main Chat Workspace */}
      <div className="ai-chat-workspace">
        <div className="chat-messages-area">
          {messages.map(msg => (
            <div key={msg.id} className={`chat-message-bubble ${msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
              <div className="bubble-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="bubble-body">
                <div className="bubble-meta">
                  <span className="sender-name">{msg.role === 'user' ? 'أنت' : 'مساعد سجل'}</span>
                  <span className="message-time">{msg.time}</span>
                </div>
                <div className="bubble-text">
                  {renderMessageContent(msg.content)}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-message-bubble assistant-bubble typing-bubble">
              <div className="bubble-avatar">🤖</div>
              <div className="bubble-body">
                <div className="bubble-meta">
                  <span className="sender-name">مساعد سجل</span>
                </div>
                <div className="ai-typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic prompt shortcuts grid */}
        {messages.length === 1 && (
          <div className="shortcuts-suggestion-grid">
            <button className="shortcut-card" onClick={() => executeShortcut('اكتب لي خطة تسويقية لزيادة مبيعات السوبرماركت الخاص بي بنسبة 25%')}>
              📝 <strong>خطة تسويق للمبيعات</strong>
              <span>تخطيط تسويقي لزيادة الأرباح</span>
            </button>
            <button className="shortcut-card" onClick={() => executeShortcut('اكتب لي وصفاً جذاباً ومحفزاً لمنتج "قهوة باردة ممتازة بالبندق ومحلاة"')}>
              📦 <strong>وصف منتج بالذكاء</strong>
              <span>صياغة تسويقية للأصناف</span>
            </button>
            <button className="shortcut-card" onClick={() => executeShortcut('أعطني 5 نصائح محاسبية وإدارية دقيقة لتقليل الهدر والتوالف والمصروفات بالمستودع')}>
              💸 <strong>تقليل النفقات والهوالك</strong>
              <span>طرق لرفع صافي الأرباح</span>
            </button>
            <button className="shortcut-card" onClick={() => executeShortcut('اكتب لي رداً احترافياً لعميل يشتكي من تأخر توصيل طلبه الإلكتروني')}>
              ✉️ <strong>ردود خدمة العملاء</strong>
              <span>صياغة خطابات للعملاء والموردين</span>
            </button>
          </div>
        )}

        {/* Input Bar form */}
        <form onSubmit={handleSend} className="ai-input-bar-form">
          <input 
            type="text" 
            className="ai-chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={apiKey ? "اسأل مساعد سجل الذكي أي شيء عن منشأتك وأعمالك..." : "الرجاء إدخال مفتاح الـ API الخاص بـ DeepSeek بالأعلى لتفعيل الشات..."}
            disabled={loading}
          />
          <button type="submit" className="btn-ai-send" disabled={loading || !input.trim()}>
            <span>إرسال</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>

      <style>{`
        .ai-assistant-container {
          background-color: var(--bg-card);
          border: 1px solid var(--border-main);
          border-radius: 12px;
          overflow: hidden;
          margin-top: 15px;
        }

        .ai-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          background-color: var(--bg-elevated);
          border-bottom: 1px solid var(--border-main);
          flex-shrink: 0;
        }

        .ai-brand {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .ai-brand .ai-icon {
          font-size: 2.2rem;
        }

        .ai-brand h2 {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-white);
          margin: 0;
        }

        .ai-brand p {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 4px 0 0 0;
          font-weight: 500;
        }

        .ai-actions {
          display: flex;
          gap: 12px;
        }

        .btn-ai-setup {
          background-color: var(--bg-tile);
          border: 1px solid var(--border-input);
          color: var(--text-white);
          padding: 10px 18px;
          border-radius: 8px !important;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-ai-setup:hover {
          background-color: var(--bg-hover-tile);
          border-color: var(--border-hover);
        }

        .btn-ai-clear {
          background-color: transparent;
          border: 1px solid var(--metro-red);
          color: var(--metro-red);
          padding: 10px 18px;
          border-radius: 8px !important;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-ai-clear:hover {
          background-color: rgba(232, 17, 35, 0.08);
        }

        /* Setup Panel */
        .ai-setup-panel {
          background-color: var(--bg-elevated);
          border-bottom: 1px solid var(--border-main);
          padding: 24px;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .ai-setup-form h3 {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--text-white);
          margin: 0 0 8px 0;
        }

        .ai-setup-form p {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0 0 20px 0;
          line-height: 1.5;
        }

        .setup-fields-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .setup-fields-grid label {
          display: block;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .setup-form-actions {
          display: flex;
          gap: 15px;
          align-items: center;
          margin-bottom: 15px;
        }

        .setup-help-link {
          font-size: 0.78rem;
          color: var(--text-dim);
          display: block;
        }

        /* Workspace & Chat messages */
        .ai-chat-workspace {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          background-color: var(--bg-black);
          overflow: hidden;
        }

        .chat-messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 30px 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .chat-message-bubble {
          display: flex;
          gap: 15px;
          max-width: 85%;
          animation: fadeInMsg 0.4s ease;
        }

        @keyframes fadeInMsg {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .chat-message-bubble.user-bubble {
          align-self: flex-start;
          flex-direction: row-reverse;
        }

        .chat-message-bubble.assistant-bubble {
          align-self: flex-end;
        }

        .bubble-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50% !important;
          background-color: var(--bg-elevated);
          border: 1px solid var(--border-main);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          flex-shrink: 0;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }

        .user-bubble .bubble-avatar {
          background-color: var(--metro-blue);
          border-color: var(--metro-blue);
          color: #ffffff;
        }

        .bubble-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .bubble-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.8rem;
          color: var(--text-dim);
          font-weight: 600;
        }

        .user-bubble .bubble-meta {
          flex-direction: row-reverse;
        }

        .sender-name {
          color: var(--text-muted);
        }

        .bubble-text {
          background-color: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 12px !important;
          padding: 14px 18px;
          font-size: 0.98rem;
          line-height: 1.6;
          color: var(--text-white);
        }

        .user-bubble .bubble-text {
          background-color: var(--bg-tile);
          border-color: var(--border-hover);
        }

        /* Typing indicator */
        .ai-typing-indicator {
          display: flex;
          gap: 5px;
          padding: 10px 15px;
          background-color: var(--bg-elevated);
          border-radius: 12px !important;
          width: fit-content;
        }
        .ai-typing-indicator span {
          width: 8px;
          height: 8px;
          background-color: var(--text-muted);
          border-radius: 50% !important;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        .ai-typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .ai-typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        /* Suggestion shortcuts cards */
        .shortcuts-suggestion-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          padding: 0 24px 20px 24px;
          max-width: 800px;
          margin: 0 auto;
        }

        .shortcut-card {
          background-color: var(--bg-elevated);
          border: 1px solid var(--border-main);
          border-radius: 10px !important;
          padding: 14px 18px;
          text-align: right;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .shortcut-card:hover {
          background-color: var(--bg-tile);
          border-color: var(--border-hover);
          transform: translateY(-2px);
        }
        .shortcut-card strong {
          font-size: 0.92rem;
          color: var(--text-white);
        }
        .shortcut-card span {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        /* Bottom chat input bar */
        .ai-input-bar-form {
          display: flex;
          gap: 12px;
          padding: 20px 24px;
          background-color: var(--bg-elevated);
          border-top: 1px solid var(--border-main);
          flex-shrink: 0;
        }

        .ai-chat-input {
          flex: 1;
          background-color: var(--bg-black);
          border: 1px solid var(--border-input);
          color: var(--text-white);
          padding: 14px 20px;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .ai-chat-input:focus {
          border-color: var(--metro-blue);
        }

        .btn-ai-send {
          background-color: var(--metro-blue);
          color: #ffffff;
          border: none;
          padding: 0 24px;
          border-radius: 8px !important;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background-color 0.2s;
        }
        .btn-ai-send:hover:not(:disabled) {
          background-color: var(--metro-dark-blue);
        }
        .btn-ai-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .ai-header-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 15px;
          }
          .setup-fields-grid {
            grid-template-columns: 1fr;
          }
          .shortcuts-suggestion-grid {
            grid-template-columns: 1fr;
          }
          .chat-message-bubble {
            max-width: 95%;
          }
        }
      `}</style>
    </div>
  );
};

export default AiAssistant;
