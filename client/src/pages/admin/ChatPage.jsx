import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/api/axios';
import { format } from 'date-fns';
import useAuthStore from '@/store/authStore';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

function RoomList({ rooms, selected, onSelect, type, setType, stats }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col h-full border-e border-neutral-100">
      {/* Header */}
      <div className="p-4 border-b border-neutral-100">
        <h2 className="font-semibold text-neutral-800">{t('admin.chat')}</h2>
        {stats && (
          <div className="flex gap-3 mt-2 text-xs text-neutral-500">
            <span>💬 {stats.supportMessages} support</span>
            <span>🤖 {stats.aiMessages} AI</span>
          </div>
        )}
      </div>

      {/* Type filter */}
      <div className="flex gap-1 p-3 border-b border-neutral-100 bg-neutral-50">
        {[['','All'],['support','Support'],['ai','AI']].map(([v,l]) => (
          <button key={v} onClick={() => setType(v)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all
              ${type === v ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:bg-neutral-200'}`}>
            {v === 'ai' ? '🤖' : v === 'support' ? '💬' : '📋'} {l}
          </button>
        ))}
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto">
        {rooms.length === 0 ? (
          <p className="p-4 text-sm text-neutral-400 text-center">No conversations</p>
        ) : rooms.map(room => {
          const isSelected = selected?.roomId === room.roomId;
          const unread     = room.unreadCountAdmin || 0;
          return (
            <button key={room.roomId} onClick={() => onSelect(room)}
              className={`w-full text-start p-3 border-b border-neutral-50 hover:bg-neutral-50
                transition-colors ${isSelected ? 'bg-primary-50 border-e-2 border-e-primary-500' : ''}`}>
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0 text-sm font-bold text-primary-700">
                  {room.patient?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-800 truncate">{room.patient?.name}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {unread > 0 && (
                        <span className="w-5 h-5 bg-primary-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                          {unread}
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        room.type === 'ai' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {room.type === 'ai' ? '🤖 AI' : '💬'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 truncate mt-0.5">
                    {room.lastMessage?.content || 'No messages yet'}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      room.status === 'open' ? 'bg-primary-50 text-primary-600' : 'bg-neutral-100 text-neutral-500'
                    }`}>
                      {room.status}
                    </span>
                    {room.lastMessage?.createdAt && (
                      <span className="text-[10px] text-neutral-400">
                        {format(new Date(room.lastMessage.createdAt), 'HH:mm')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isAdmin  = msg.senderRole === 'admin';
  const isAi     = msg.senderRole === 'ai';
  const isSystem = msg.type === 'system';

  if (isSystem) return (
    <div className="flex justify-center my-2">
      <span className="text-xs text-neutral-400 bg-neutral-100 px-3 py-1 rounded-full">
        {msg.content}
      </span>
    </div>
  );

  return (
    <div className={`flex mb-3 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
      {!isAdmin && (
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold me-2 shrink-0 mt-1
          ${isAi ? 'bg-purple-600 text-white' : 'bg-primary-100 text-primary-700'}`}>
          {isAi ? '🤖' : msg.sender?.name?.[0] || '?'}
        </div>
      )}
      <div className="max-w-[70%]">
        {!isAdmin && (
          <p className="text-[10px] text-neutral-400 mb-1">
            {isAi ? 'AI Assistant' : msg.sender?.name}
          </p>
        )}
        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
          isAdmin
            ? 'bg-primary-600 text-white rounded-tr-sm'
            : isAi
              ? 'bg-purple-50 text-purple-900 border border-purple-100 rounded-tl-sm'
              : 'bg-white border border-neutral-200 text-neutral-800 rounded-tl-sm shadow-sm'
        }`}>
          {msg.content}
        </div>
        <p className="text-[10px] text-neutral-400 mt-1">
          {format(new Date(msg.createdAt), 'HH:mm')}
        </p>
      </div>
    </div>
  );
}

export default function AdminChatPage() {
  const { t }           = useTranslation();
  const { accessToken } = useAuthStore();
  const qc              = useQueryClient();
  const [selected,    setSelected]    = useState(null);
  const [typeFilter,  setTypeFilter]  = useState('');
  const [messages,    setMessages]    = useState([]);
  const [reply,       setReply]       = useState('');
  const [sending,     setSending]     = useState(false);
  const socketRef   = useRef(null);
  const bottomRef   = useRef(null);

  // Chat stats
  const { data: statsData } = useQuery({
    queryKey: ['admin-chat-stats'],
    queryFn:  () => api.get('/chat/admin/stats').then(r => r.data.data),
  });

  // Rooms list
  const { data: roomsData, refetch: refetchRooms } = useQuery({
    queryKey: ['admin-chat-rooms', typeFilter],
    queryFn:  () => api.get('/chat/admin/rooms', { params: { limit:50, type: typeFilter || undefined } })
      .then(r => r.data.data),
  });

  const rooms = Array.isArray(roomsData) ? roomsData : [];

  // Load messages when room selected
  useEffect(() => {
    if (!selected) return;
    api.get(`/chat/admin/rooms/${selected.roomId}/messages`, { params: { limit: 100 } })
      .then(r => {
        const data = r.data.data;
        setMessages(Array.isArray(data) ? data : []);
      });
  }, [selected?.roomId]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket for real-time
  useEffect(() => {
    if (!accessToken) return;
    const socket = io(SOCKET_URL, { auth: { token: accessToken }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('message:new', (msg) => {
      if (selected && msg.room === selected.roomId) {
        setMessages(prev => [...prev, msg]);
      }
      refetchRooms();
    });

    socket.on('chat:notification', () => refetchRooms());

    return () => socket.disconnect();
  }, [accessToken, selected?.roomId]);

  const sendReply = async () => {
    if (!reply.trim() || !selected || sending) return;
    setSending(true);
    try {
      socketRef.current?.emit('message:send', {
        roomId: selected.roomId,
        content: reply.trim(),
      });
      setReply('');
    } finally {
      setSending(false);
    }
  };

  const toggleRoom = async () => {
    if (!selected) return;
    const endpoint = selected.status === 'open' ? 'close' : 'reopen';
    await api.patch(`/chat/admin/rooms/${selected.roomId}/${endpoint}`);
    refetchRooms();
    setSelected(prev => ({ ...prev, status: prev.status === 'open' ? 'closed' : 'open' }));
  };

  return (
    <div className="flex h-[calc(100vh-80px)] -m-6 overflow-hidden rounded-xl border border-neutral-200">
      {/* Sidebar */}
      <div className="w-72 shrink-0 bg-white">
        <RoomList
          rooms={rooms}
          selected={selected}
          onSelect={setSelected}
          type={typeFilter}
          setType={setTypeFilter}
          stats={statsData}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-neutral-50">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-neutral-500">Select a conversation</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700">
                  {selected.patient?.name?.[0]}
                </div>
                <div>
                  <p className="font-medium text-sm">{selected.patient?.name}</p>
                  <p className="text-xs text-neutral-400">
                    {selected.patient?.email} ·
                    <span className={`ms-1 ${selected.type === 'ai' ? 'text-purple-600' : 'text-blue-600'}`}>
                      {selected.type === 'ai' ? '🤖 AI Chat' : '💬 Support'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  selected.status === 'open' ? 'bg-primary-50 text-primary-600' : 'bg-neutral-100 text-neutral-500'
                }`}>{selected.status}</span>
                {selected.type === 'support' && (
                  <button onClick={toggleRoom}
                    className={`btn-sm text-xs ${selected.status === 'open' ? 'btn-ghost text-red-500' : 'btn-secondary'}`}>
                    {selected.status === 'open' ? '🔒 Close' : '🔓 Reopen'}
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <p className="text-center text-neutral-400 text-sm mt-8">No messages yet</p>
              ) : messages.map((msg, i) => (
                <MessageBubble key={msg._id || i} msg={msg}/>
              ))}
              <div ref={bottomRef}/>
            </div>

            {/* Reply (support only, not AI) */}
            {selected.type === 'support' && selected.status === 'open' && (
              <div className="px-4 py-3 bg-white border-t border-neutral-100">
                <div className="flex gap-2">
                  <input
                    className="input flex-1 text-sm"
                    placeholder="Reply to patient…"
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendReply())}
                  />
                  <button onClick={sendReply} disabled={!reply.trim() || sending}
                    className="btn-primary px-4 disabled:opacity-40">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  {selected.type === 'ai' ? '🤖 AI conversation — read only' : 'Enter to send'}
                </p>
              </div>
            )}
            {selected.type === 'ai' && (
              <div className="px-4 py-3 bg-purple-50 border-t border-purple-100">
                <p className="text-xs text-purple-600 text-center">
                  🤖 AI Chat history — read only view
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
