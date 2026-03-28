import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useQuery } from '@tanstack/react-query';
import { chatAPI } from '@/api/services';
import useAuthStore from '@/store/authStore';

export default function ChatPage() {
  const { accessToken: storeToken, user } = useAuthStore();
  const accessToken = storeToken || localStorage.getItem('accessToken');

  const [socket, setSocket]           = useState(null);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [room, setRoom]               = useState(null);
  const [isTyping, setIsTyping]       = useState(false);
  const [connected, setConnected]     = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  const messagesEndRef = useRef(null);
  const typingTimer    = useRef(null);
  const pendingMsgs    = useRef([]);

  // ✅ الـ userId الصح — الـ user من الـ API بييجي بـ _id
  const myUserId = user?._id || user?.id || user?.sub;

  // ── Fetch room ────────────────────────────────────────────────────────
  const { data: roomData } = useQuery({
    queryKey: ['my-chat-room'],
    queryFn:  () => chatAPI.getMyRoom().then(r => r.data.data),
    retry: 2,
  });

  useEffect(() => {
    if (roomData) setRoom(roomData);
  }, [roomData]);

  // ── Socket connection ─────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken || !room) return;

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const s = io(SOCKET_URL, {
      auth:       { token: accessToken },
      transports: ['websocket', 'polling'],
      timeout:    10000,
      reconnectionAttempts: 5,
    });

    s.on('connect', () => {
      setConnected(true);
      setConnectionStatus('connected');
      s.emit('room:join', { roomId: room.roomId });

      if (pendingMsgs.current.length > 0) {
        pendingMsgs.current.forEach(content => {
          s.emit('message:send', { roomId: room.roomId, content });
        });
        pendingMsgs.current = [];
      }
    });

    s.on('connect_error', () => {
      setConnected(false);
      setConnectionStatus('error');
    });

    s.on('disconnect', () => {
      setConnected(false);
      setConnectionStatus('connecting');
    });

    // تاريخ الرسائل — بيبدّل كل الـ optimistic بالرسائل الحقيقية
    s.on('messages:history', ({ messages: msgs }) => {
      setMessages(msgs);
    });

    // ✅ رسالة جديدة — بتشيل الـ optimistic المطابقة وتحط الحقيقية
    s.on('message:new', (msg) => {
      setMessages(prev => {
        // شيل الـ optimistic اللي ليها نفس المحتوى
        const withoutOptimistic = prev.filter(m => {
          if (!m.pending) return true;
          return m.content !== msg.content;
        });
        // لو موجودة فعلاً متضيفهاش
        const alreadyExists = withoutOptimistic.some(m => m._id === msg._id);
        if (alreadyExists) return withoutOptimistic;
        return [...withoutOptimistic, msg];
      });
    });

    s.on('typing', ({ name, isTyping: t }) => {
      if (name !== user?.name) setIsTyping(t);
    });

    s.on('message:deleted', ({ messageId }) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, content: '[تم حذف الرسالة]', isDeleted: true } : m
      ));
    });

    setSocket(s);
    return () => s.disconnect();
  }, [accessToken, room]);

  // ── Auto scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────
  const sendMessage = () => {
    const content = input.trim();
    if (!content || room?.status === 'closed') return;

    // Optimistic UI
    const optimisticMsg = {
      _id:       `optimistic-${Date.now()}`,
      content,
      sender:    { _id: myUserId, name: user?.name },
      createdAt: new Date().toISOString(),
      type:      'user',
      pending:   true,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setInput('');

    if (socket?.connected) {
      socket.emit('message:send', { roomId: room.roomId, content });
    } else {
      pendingMsgs.current.push(content);
    }
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    if (socket?.connected && room) {
      socket.emit('typing', { roomId: room.roomId, isTyping: true });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        socket.emit('typing', { roomId: room.roomId, isTyping: false });
      }, 1500);
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────
  const isClosed = room?.status === 'closed';

  const statusConfig = {
    connected:  { color: 'bg-primary-500', label: 'متصل',           pulse: true  },
    connecting: { color: 'bg-yellow-400',  label: 'جاري الاتصال…',  pulse: true  },
    error:      { color: 'bg-red-400',     label: 'خطأ في الاتصال', pulse: false },
  };
  const status = statusConfig[connectionStatus];

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="section">
      <div className="container-app max-w-3xl">
        <div className="card flex flex-col h-[70vh]">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-xl">💬</span>
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-neutral-800">دعم الصيدلية</h2>
              <p className="text-xs text-neutral-500">فريقنا هنا لمساعدتك</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${status.color} ${status.pulse ? 'animate-pulse' : ''}`}/>
              <span className="text-xs text-neutral-500">{status.label}</span>
            </div>
          </div>

          {/* Connection error banner */}
          {connectionStatus === 'error' && (
            <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200 text-center">
              <p className="text-xs text-yellow-700">
                ⚠️ الاتصال منقطع — رسائلك محفوظة وستُرسل عند إعادة الاتصال
              </p>
            </div>
          )}

          {/* Closed banner */}
          {isClosed && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-center">
              <p className="text-xs text-red-600">🔒 تم إغلاق هذه المحادثة</p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-10">
                <p className="text-4xl mb-3">👋</p>
                <p className="text-neutral-600 font-medium">كيف يمكننا مساعدتك اليوم؟</p>
                <p className="text-sm text-neutral-400 mt-1">أرسل رسالة للبدء</p>
              </div>
            )}

            {messages.map((msg) => {
              // ✅ مقارنة صح مع toString() علشان MongoDB ObjectId
              const senderId = msg.sender?._id?.toString() || msg.sender?.toString();
              const isMine   = senderId === myUserId?.toString();

              if (msg.type === 'system') return (
                <div key={msg._id} className="text-center">
                  <span className="text-xs text-neutral-400 bg-neutral-100 px-3 py-1 rounded-full">
                    {msg.content}
                  </span>
                </div>
              );

              return (
                <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-sm
                    ${isMine
                      ? `bg-primary-600 text-white rounded-tr-sm ${msg.pending ? 'opacity-70' : ''}`
                      : 'bg-neutral-100 text-neutral-800 rounded-tl-sm'
                    }`}>

                    {!isMine && (
                      <p className="text-xs font-semibold mb-1 text-primary-700">
                        {msg.sender?.name}
                      </p>
                    )}

                    <p className="leading-relaxed">{msg.content}</p>

                    <div className={`flex items-center justify-end gap-1 mt-1
                      ${isMine ? 'text-primary-200' : 'text-neutral-400'}`}>
                      <span className="text-[10px]">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                      </span>
                      {isMine && msg.pending && (
                        <svg className="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                      )}
                      {isMine && !msg.pending && (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-neutral-100 px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}/>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef}/>
          </div>

          {/* Input */}
          <div className="border-t border-neutral-100 p-4 flex gap-3">
            <input
              className="input flex-1"
              placeholder={
                isClosed   ? 'تم إغلاق المحادثة' :
                !connected ? 'اكتب رسالتك… (ستُرسل عند الاتصال)' :
                             'اكتب رسالتك هنا…'
              }
              value={input}
              onChange={handleTyping}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={isClosed}
              dir="auto"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isClosed}
              className="btn-primary px-4 py-2.5 disabled:opacity-40">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}