import React, { useState, useEffect, useRef } from 'react';
import Api from '../../services/api';
import '../../styles/components/FloatingAiChat.css';

const FloatingAiChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [imageBase64, setImageBase64] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Check if the user is a manager or admin
    if (Api.isAdminOrBranchManager()) {
      setCanAccess(true);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!canAccess) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result);
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageBase64(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !imageBase64) return;

    const userMsg = { id: Date.now(), text: inputMessage, image: imagePreview, sender: 'user' };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    const currentImage = imageBase64;
    removeImage();
    setIsLoading(true);

    try {
      console.log('Sending message to API:', userMsg.text);
      const response = await Api.post('/chat', { 
        message: userMsg.text,
        imageBase64: currentImage
      });
      console.log('Received response from API:', response);
      
      let aiText = response.response;
      if (!aiText) {
         console.warn('API returned empty response property!');
         aiText = "عذراً، وصلني رد فارغ من الخادم.";
      }
      
      const aiMsg = { id: Date.now() + 1, text: aiText, sender: 'ai' };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error('Error during chat request:', error);
      const errorMsg = { id: Date.now() + 1, text: 'عذراً، حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.', sender: 'error' };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="floating-ai-chat-container">
      {isOpen ? (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <i className="fa-solid fa-robot"></i>
              <span>المساعد الذكي (ERP)</span>
            </div>
            <button className="close-chat-btn" onClick={() => setIsOpen(false)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="ai-chat-messages">
            {messages.length === 0 && (
              <div className="ai-chat-empty">
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                <p>مرحباً بك! أنا مساعدك الذكي لنظام إدارة الموارد ونقاط البيع. كيف يمكنني مساعدتك اليوم؟</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-message-wrapper ${msg.sender}`}>
                <div className="ai-message-bubble">
                  {msg.image && (
                    <img src={msg.image} alt="User attachment" className="ai-message-image" />
                  )}
                  {msg.text && <div>{msg.text}</div>}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="ai-message-wrapper ai">
                <div className="ai-message-bubble loading">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-chat-input-area">
            {imagePreview && (
              <div className="ai-chat-image-preview">
                <img src={imagePreview} alt="Preview" />
                <button className="remove-image-btn" onClick={removeImage}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            )}
            <div className="ai-chat-input-controls">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleImageChange}
              />
              <button 
                className="ai-attach-btn" 
                onClick={() => fileInputRef.current.click()}
                disabled={isLoading}
              >
                <i className="fa-solid fa-paperclip"></i>
              </button>
              <input
                type="text"
                placeholder="اكتب رسالتك هنا..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              <button className="ai-send-btn" onClick={handleSendMessage} disabled={isLoading || (!inputMessage.trim() && !imageBase64)}>
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button className="ai-chat-fab" onClick={() => setIsOpen(true)}>
          <i className="fa-solid fa-robot"></i>
        </button>
      )}
    </div>
  );
};

export default FloatingAiChat;
