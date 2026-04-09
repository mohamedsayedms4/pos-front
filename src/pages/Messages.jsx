import React, { useState, useEffect, useRef } from 'react';
import Api, { API_BASE } from '../services/api';
import ChatService from '../services/ChatService';
import { useGlobalUI } from '../components/common/GlobalUI';
import msgIcon from '../assets/img/msg.png';

const Messages = () => {
  const { showToast } = useGlobalUI();
  const [employees, setEmployees] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const currentUser = Api._getUser();
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const selectedUserRef = useRef(null);

  // Sync ref with state
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);


  // Initialize: Load Employees and Connect WebSocket
  useEffect(() => {
    loadEmployees();
    
    // Connect to WebSocket base connection
    ChatService.connect();

    // Subscribe to messages
    const unsubMsg = ChatService.onMessage((incomingMsg) => {
      handleIncomingMessage(incomingMsg);
    });

    // Subscribe to presence
    const unsubPresence = ChatService.onPresence((presenceUpdate) => {
      handlePresenceUpdate(presenceUpdate);
    });

    // Initial fetch
    ChatService.getOnlineUsers().then(ids => setOnlineUserIds(new Set(ids))).catch(() => {});
    ChatService.getUnreadCountsPerUser().then(setUnreadCounts).catch(() => {});

    return () => {
      unsubMsg();
      unsubPresence();
    };
  }, []);


  // Scroll to bottom when messages change (only on initial load or new message)
  useEffect(() => {
    if (page === 0 && !loadingMore) {
        scrollToBottom();
    }
  }, [messages, page, loadingMore]);

  // Handle scroll for infinite loading
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container || !selectedUser) return;

    const handleScroll = () => {
      // Trigger when scrolled to top
      if (container.scrollTop <= 5 && hasMore && !loadingMore && !loading) {
        loadMoreMessages();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, loading, selectedUser, page]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadEmployees = async () => {
    // 1. Try to load from cache
    const cached = localStorage.getItem('pos_employees_cache');
    if (cached) {
      setEmployees(JSON.parse(cached));
    }

    try {
      // Fetch all employees (size=100 for now)
      const res = await Api.getUsers(0, 100);
      const list = res.items || res.content || res;
      // Filter out self
      const others = list.filter(u => u.id !== currentUser.id);
      
      // 2. Update state and cache
      setEmployees(others);
      localStorage.setItem('pos_employees_cache', JSON.stringify(others));
    } catch (err) {
      if (!cached) showToast('خطأ في تحميل قائمة الموظفين', 'error');
    }
  };


  const handleIncomingMessage = (msg) => {
    const currentSelected = selectedUserRef.current;
    // If msg is from/to current selected user, add to list
    if (currentSelected && (msg.senderId === currentSelected.id || msg.recipientId === currentSelected.id)) {
      setMessages(prev => {
        // Prevent duplicates
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      
      // If we are the recipient, mark as read immediately
      if (msg.recipientId === currentUser.id) {
        ChatService.markAsRead(currentSelected.id);
      }
    } else {
      // Increment unread count for the sender
      if (msg.senderId !== currentUser.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [msg.senderId]: (prev[msg.senderId] || 0) + 1
        }));
        showToast(`رسالة جديدة من ${msg.senderName}`, 'info');
      }
    }
  };


  const handlePresenceUpdate = (update) => {
    setOnlineUserIds(prev => {
      const next = new Set(prev);
      if (update.status === 'ONLINE') next.add(update.userId);
      else next.delete(update.userId);
      return next;
    });
  };

  const selectUser = async (user) => {
    setSelectedUser(user);
    setLoading(true);
    setPage(0);
    setHasMore(true);
    
    try {
      const res = await ChatService.getChatHistory(user.id, 0);
      // Backend returns DESC (latest first) per page, we reverse to show ASC
      const history = [...(res.items || [])].reverse();
      setMessages(history);
      setHasMore(!res.isLast);
      
      // Clear unread count
      setUnreadCounts(prev => ({ ...prev, [user.id]: 0 }));
      
      // Mark as read in backend
      ChatService.markAsRead(user.id);
      ChatService.notifyCountUpdate(); 
    } catch (err) {
      showToast('فشل في تحميل سجل المحادثة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!selectedUser || !hasMore || loadingMore || loading) return;

    const nextPage = page + 1;
    setLoadingMore(true);

    const container = chatContainerRef.current;
    const previousScrollHeight = container.scrollHeight;

    try {
      const res = await ChatService.getChatHistory(selectedUser.id, nextPage);
      const olderMessages = [...(res.items || [])].reverse();
      
      setMessages(prev => [...olderMessages, ...prev]);
      setPage(nextPage);
      setHasMore(!res.isLast);

      // Restore scroll position after DOM update
      setTimeout(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - previousScrollHeight;
        }
      }, 0);
    } catch (err) {
      console.error('Load more failed:', err);
      showToast('فشل في تحميل الرسائل القديمة', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    ChatService.sendMessage(selectedUser.id, newMessage);
    
    // We don't append to local state here because ChatService handles the loopback 
    // via WS (both sender and recipient get the message).
    setNewMessage('');
  };

  return (
    <div className="chat-page-container">
      <div className={`chat-layout ${selectedUser ? 'user-selected' : ''}`}>

        
        {/* Contacts Sidebar */}
        <div className="chat-sidebar">
          <div className="sidebar-header">
            <button className="back-to-home" onClick={() => window.location.href = '/'} title="العودة للرئيسية">
              🏠
            </button>
            <h3><img src={msgIcon} alt="" style={{ width: '20px', height: '20px', verticalAlign: 'middle', marginRight: '5px' }} /> المحادثات</h3>
          </div>

          <div className="contacts-list">
            {employees.map(emp => (
              <div 
                key={emp.id} 
                className={`contact-item ${selectedUser?.id === emp.id ? 'active' : ''}`}
                onClick={() => selectUser(emp)}
              >
                <div className="avatar-wrapper">
                  {emp.profilePicture ? (
                    <img src={`${API_BASE}/products/images/${emp.profilePicture}`} alt="" />
                  ) : (
                    <div className="avatar-placeholder">{emp.name.charAt(0)}</div>
                  )}
                  {onlineUserIds.has(emp.id) && <span className="online-indicator"></span>}
                </div>
                <div className="contact-info">
                  <div className="contact-name">{emp.name}</div>
                  <div className="contact-title">{emp.jobTitle?.name || 'موظف'}</div>
                </div>
                {unreadCounts[emp.id] > 0 && (
                  <div className="unread-badge">{unreadCounts[emp.id]}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="chat-main">
          {selectedUser ? (
            <>
              <div className="chat-header">
                <div className="selected-user-info">
                  <button className="back-button mobile-only" onClick={() => setSelectedUser(null)}>
                    <span className="back-arrow">⬅</span>
                  </button>
                  <div className="avatar-small">
                    {selectedUser.profilePicture ? (
                      <img src={`${API_BASE}/products/images/${selectedUser.profilePicture}`} alt="" />
                    ) : (
                      <div className="avatar-placeholder">{selectedUser.name.charAt(0)}</div>
                    )}
                  </div>
                  <div>
                    <div className="name">{selectedUser.name}</div>
                    <div className="status">
                      {onlineUserIds.has(selectedUser.id) ? '● متصل الآن' : 'غير متصل'}
                    </div>
                  </div>
                </div>
              </div>


              <div className="messages-window" ref={chatContainerRef}>
                {loading ? (
                  <div className="chat-loading">جاري تحميل المحادثة...</div>
                ) : (
                  <>
                    {loadingMore && (
                        <div className="loading-more">جاري تحميل رسائل أقدم...</div>
                    )}
                    
                    {!hasMore && messages.length > 0 && (
                        <div className="no-more-messages">هذه هي بداية المحادثة</div>
                    )}

                    {messages.map((msg, idx) => {
                      const isMe = msg.senderId === currentUser.id;
                      return (
                        <div key={msg.id || idx} className={`message-row ${isMe ? 'me' : 'them'}`}>
                          <div className="bubble-stack">
                            <div className="sender-name">{isMe ? 'أنا' : msg.senderName}</div>
                            <div className="message-bubble">
                              <div className="content">{msg.content}</div>
                              <div className="meta">
                                <span className="time">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isMe && (
                                  <span className={`status-icon ${msg.status === 'READ' ? 'read' : ''}`}>
                                    {msg.status === 'READ' ? '✓✓' : '✓'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <form className="chat-input-area" onSubmit={handleSendMessage}>
                <input 
                  type="text" 
                  placeholder="اكتب رسالتك هنا..." 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  autoFocus
                />
                <button type="submit" disabled={!newMessage.trim()}>
                  <span className="send-icon">➤</span>
                </button>
              </form>
            </>
          ) : (
            <div className="no-chat-selected">
              <div className="welcome-chat">
                <div className="icon"><img src={msgIcon} alt="" style={{ width: '100px', height: '100px', opacity: 0.8 }} /></div>
                <h2>مرحباً بك في نظام التراسل الداخلي</h2>
                <p>اختر زميلاً من القائمة الجانبية لبدء المحادثة</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .chat-page-container {
          height: calc(100vh - 80px);
          max-height: none;
          margin: 0;
          padding: 0;
          overflow: hidden;
          width: 100%;
          border-top: 1px solid var(--border-subtle);
        }

        .chat-layout {
          display: flex;
          height: 100%;
          background: var(--bg-dark);
          border-radius: 12px;
          border: 1px solid var(--border-subtle);
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          overflow: hidden;
          position: relative;
        }

        /* Sidebar */
        .chat-sidebar {
          width: 300px;
          background: var(--bg-dark);
          border-left: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
        }

        .chat-sidebar .sidebar-header {
          padding: 20px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .contacts-list {
          flex: 1;
          overflow-y: auto;
        }

        .contact-item {
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 1px solid var(--border-subtle);
          color: var(--text-main);
          position: relative;
        }

        .contact-item:hover {
          background: var(--bg-tile);
        }

        .contact-item.active {
          background: var(--bg-tile);
          border-right: 4px solid var(--metro-blue);
        }

        .avatar-wrapper {
          position: relative;
          width: 48px;
          height: 48px;
        }

        .avatar-wrapper img, .avatar-placeholder, .avatar-small img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-placeholder {
          background: var(--metro-blue);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.2rem;
          color: white;
        }

         .online-indicator {
           position: absolute;
           bottom: 2px;
           right: 2px;
           width: 12px;
           height: 12px;
           background: #4caf50;
           border: 2px solid var(--bg-dark);
           border-radius: 50%;
         }

        .contact-info .contact-name {
          font-weight: 600;
          margin-bottom: 2px;
        }

        .contact-info .contact-title {
          font-size: 0.75rem;
          color: var(--text-dim);
        }

        .unread-badge {
          margin-right: auto; /* Pushes to the opposite side in flex RTL */
          background: #25d366; /* WhatsApp Green */
          color: white;
          font-size: 0.75rem;
          min-width: 22px;
          height: 22px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 6px;
          font-weight: bold;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          z-index: 2;
        }

        /* Main Chat */
        .chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png');
          background-position: center;
          background-size: cover;
          position: relative;
        }

        .chat-main::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(10, 10, 10, 0.9);
          z-index: 1;
        }

        [data-theme='light'] .chat-main::before {
          background: rgba(255, 255, 255, 0.95);
        }

        .chat-header, .messages-window, .chat-input-area, .no-chat-selected {
          position: relative;
          z-index: 2;
        }

         .chat-header {
           padding: 15px 25px;
           background: var(--bg-dark);
           border-bottom: 1px solid var(--border-subtle);
         }

        .selected-user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .avatar-small {
          width: 40px;
          height: 40px;
        }

        .selected-user-info .name {
          font-weight: 600;
        }

        .selected-user-info .status {
          font-size: 0.75rem;
          color: #4caf50;
        }

        .messages-window {
          flex: 1;
          padding: 25px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .message-row {
          display: flex;
          width: 100%;
          margin-bottom: 12px;
        }

        .message-row.me {
          justify-content: flex-start; /* Right side in RTL */
        }

        .message-row.them {
          justify-content: flex-end; /* Left side in RTL */
        }

        .bubble-stack {
          display: flex;
          flex-direction: column;
          max-width: 75%;
        }

        .message-row.me .bubble-stack {
          align-items: flex-end;
        }

        .message-row.them .bubble-stack {
          align-items: flex-start;
          text-align: left;
        }

        .sender-name {
          font-size: 0.8rem;
          margin-bottom: 4px;
          font-weight: 600;
          color: var(--text-dim);
          padding: 0 8px;
        }

        .message-row.me .sender-name {
          color: var(--metro-blue);
          text-align: right;
        }

        .message-row.them .sender-name {
          text-align: left;
        }

        .message-bubble {
          max-width: 80%;
          padding: 10px 15px;
          border-radius: 12px;
          position: relative;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          line-height: 1.5;
          font-size: 0.95rem;
        }

        .message-row.me .message-bubble {
          background: #0084ff;
          color: white;
          border-top-right-radius: 2px;
        }

        .message-row.me .message-bubble::after {
          content: "";
          position: absolute;
          top: 0;
          right: -8px;
          width: 0;
          height: 0;
          border-top: 10px solid #0084ff;
          border-right: 10px solid transparent;
        }

        .message-row.them .message-bubble {
          background: rgba(255,255,255,0.08);
          color: #f0f0f0;
          border-top-left-radius: 2px;
          border: 1px solid rgba(255,255,255,0.1);
        }

        [data-theme='light'] .message-row.them .message-bubble {
          background: #ffffff;
          color: #333;
          border: 1px solid #e0e0e0;
        }

        .message-row.them .message-bubble::after {
          content: "";
          position: absolute;
          top: 0;
          left: -8px;
          width: 0;
          height: 0;
          border-top: 10px solid rgba(255,255,255,0.08);
          border-left: 10px solid transparent;
        }

        [data-theme='light'] .message-row.them .message-bubble::after {
          border-top-color: #ffffff;
        }

        .message-bubble .meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 5px;
          font-size: 0.65rem;
          margin-top: 4px;
          opacity: 0.8;
        }

        .status-icon.read {
          color: #4fc3f7;
        }

        .chat-input-area {
          padding: 15px 20px;
          background: var(--bg-dark);
          border-top: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 2;
        }

        .chat-input-area input {
          flex: 1;
          background: rgba(255,255,255,0.08);
          border: 1px solid var(--border-subtle);
          border-radius: 25px;
          padding: 12px 20px;
          color: white;
          outline: none;
        }

        .chat-input-area button {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          border: none;
          background: var(--metro-blue);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }

        .chat-input-area button:hover {
          transform: scale(1.1);
        }

        .chat-input-area button:disabled {
          background: #444;
          cursor: not-allowed;
          transform: none;
        }

        .send-icon {
          transform: rotate(180deg);
          font-size: 1.2rem;
        }

        .no-chat-selected {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .welcome-chat .icon {
          font-size: 5rem;
          margin-bottom: 20px;
          opacity: 0.2;
        }

        .welcome-chat h2 {
          margin-bottom: 10px;
          color: var(--text-dim);
        }

        .chat-loading {
          text-align: center;
          padding: 40px;
          color: var(--text-dim);
        }

        .loading-more {
            text-align: center;
            padding: 10px;
            font-size: 0.8rem;
            color: var(--metro-blue);
            font-weight: 600;
        }

        .no-more-messages {
            text-align: center;
            padding: 15px;
            font-size: 0.75rem;
            color: var(--text-dim);
            font-style: italic;
            border-bottom: 1px dashed var(--border-subtle);
            margin-bottom: 15px;
        }

        .mobile-only {
          display: none;
        }

        .back-button {
          background: none;
          border: none;
          color: var(--metro-blue);
          font-size: 1.5rem;
          cursor: pointer;
          padding: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: -10px;
          margin-left: 5px;
        }

        @media (max-width: 768px) {
          .chat-page-container {
            height: calc(100vh - var(--topbar-height));
            margin: -24px;
            width: calc(100% + 48px);
            max-height: none;
          }

          .chat-layout {
            border-radius: 0;
            border: none;
            box-shadow: none;
          }

          .mobile-only {
            display: flex;
          }

          .chat-sidebar {
            width: 100%;
            border-left: none;
          }

          .chat-layout.user-selected .chat-sidebar {
            display: none;
          }

          .chat-main {
            width: 100%;
            display: none;
          }

          .chat-layout.user-selected .chat-main {
            display: flex;
          }

          .chat-header {
            padding: 10px 15px;
          }

          .messages-window {
            padding: 15px;
          }

          .message-bubble {
            max-width: 85%;
          }

          .chat-input-area {
            padding: 10px 15px;
          }
        }
      `}</style>
    </div>
  );
};

export default Messages;

