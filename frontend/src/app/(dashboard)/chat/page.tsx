'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import {
  Send, Search, Plus, Phone, Video, MoreVertical, Paperclip,
  Smile, Mic, Image, File, ArrowLeft, Users, Pin, Info,
  CheckCheck, Check, Circle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

let socket: Socket | null = null;

export default function ChatPage() {
  const { user, tokens } = useAuthStore();
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const { data: conversations, refetch: refetchConvs } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiClient.get('/chat/conversations').then((r) => r.data.data),
  });

  // Initialize Socket.IO
  useEffect(() => {
    if (!tokens?.accessToken) return;

    socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000', {
      auth: { token: tokens.accessToken },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket?.emit('notification:subscribe');
    });

    socket.on('chat:message:new', (msg: any) => {
      if (selectedConv && msg.conversationId === selectedConv._id) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }
      refetchConvs();
    });

    socket.on('chat:typing', ({ userId, isTyping: typing }: any) => {
      if (userId !== user?.id) {
        setTypingUsers((prev) =>
          typing ? [...prev.filter((u) => u !== userId), userId] : prev.filter((u) => u !== userId)
        );
      }
    });

    socket.on('user:online', ({ userId }: any) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    });

    socket.on('user:offline', ({ userId }: any) => {
      setOnlineUsers((prev) => { const s = new Set(prev); s.delete(userId); return s; });
    });

    return () => { socket?.disconnect(); socket = null; };
  }, [tokens?.accessToken]);

  // Load messages when conversation selected
  useEffect(() => {
    if (!selectedConv) return;

    apiClient.get(`/chat/conversations/${selectedConv._id}/messages`).then((r) => {
      setMessages(r.data.data || []);
      scrollToBottom();
    });

    socket?.emit('chat:join', { conversationId: selectedConv._id });
    socket?.emit('chat:read', { conversationId: selectedConv._id });

    return () => {
      socket?.emit('chat:leave', { conversationId: selectedConv._id });
    };
  }, [selectedConv?._id]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv) return;

    socket?.emit('chat:message', {
      conversationId: selectedConv._id,
      content: newMessage.trim(),
      type: 'text',
    });

    setNewMessage('');
    clearTyping();
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!selectedConv) return;

    socket?.emit('chat:typing', { conversationId: selectedConv._id, isTyping: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => clearTyping(), 2000);
  };

  const clearTyping = () => {
    if (selectedConv) {
      socket?.emit('chat:typing', { conversationId: selectedConv._id, isTyping: false });
    }
  };

  const getConvName = (conv: any) => {
    if (conv.name) return conv.name;
    const other = conv.participants?.find((p: any) => p.userId !== user?.id);
    return other ? `User ${other.userId.slice(0, 8)}` : 'Unknown';
  };

  const getConvAvatar = (conv: any) => {
    if (conv.type !== 'direct') return null;
    return null;
  };

  const filteredConvs = conversations?.filter((c: any) =>
    !searchQuery || getConvName(c).toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const groupMessagesByDate = (msgs: any[]) => {
    const groups: { date: string; messages: any[] }[] = [];
    msgs.forEach((msg) => {
      const date = format(new Date(msg.createdAt), 'yyyy-MM-dd');
      const lastGroup = groups[groups.length - 1];
      if (lastGroup?.date === date) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({ date, messages: [msg] });
      }
    });
    return groups;
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMMM d, yyyy');
  };

  return (
    <div className="flex h-[calc(100vh-4rem-3rem)] bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Sidebar */}
      <div className={cn(
        'flex flex-col border-r border-gray-100 dark:border-gray-800 w-80 flex-shrink-0',
        selectedConv ? 'hidden md:flex' : 'flex w-full'
      )}>
        {/* Search */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 dark:text-white">Messages</h2>
            <button className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 flex items-center justify-center hover:bg-primary-100 transition">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConvs.map((conv: any) => {
            const name = getConvName(conv);
            const isActive = selectedConv?._id === conv._id;
            const otherParticipant = conv.participants?.find((p: any) => p.userId !== user?.id);
            const isOnline = otherParticipant && onlineUsers.has(otherParticipant.userId);

            return (
              <button
                key={conv._id}
                onClick={() => setSelectedConv(conv)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left',
                  isActive && 'bg-primary-50 dark:bg-primary-900/10 border-r-2 border-primary-500'
                )}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                    {conv.type === 'group' || conv.type === 'research_group'
                      ? <Users className="w-5 h-5" />
                      : name.slice(0, 2).toUpperCase()}
                  </div>
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</p>
                    {conv.lastMessageAt && (
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                        {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {conv.lastMessage?.content || 'No messages yet'}
                  </p>
                </div>
              </button>
            );
          })}

          {filteredConvs.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No conversations yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <button onClick={() => setSelectedConv(null)} className="md:hidden mr-1">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm">
                {selectedConv.type === 'group' ? <Users className="w-4 h-4" /> : getConvName(selectedConv).slice(0, 2).toUpperCase()}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{getConvName(selectedConv)}</p>
              <p className="text-xs text-emerald-500">
                {typingUsers.length > 0 ? 'typing...' : 'Online'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 transition">
                <Phone className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 transition">
                <Video className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 transition">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50 dark:bg-gray-950">
            {groupMessagesByDate(messages).map(({ date, messages: dayMsgs }) => (
              <div key={date}>
                <div className="flex items-center justify-center my-4">
                  <span className="px-3 py-1 bg-white dark:bg-gray-800 text-xs text-gray-500 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
                    {formatDateLabel(date)}
                  </span>
                </div>
                {dayMsgs.map((msg: any, i: number) => {
                  const isMe = msg.senderId === user?.id;
                  const showAvatar = !isMe && (i === 0 || dayMsgs[i - 1]?.senderId !== msg.senderId);

                  return (
                    <motion.div
                      key={msg._id || i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn('flex items-end gap-2 mb-1', isMe ? 'flex-row-reverse' : 'flex-row')}
                    >
                      {!isMe && (
                        <div className={cn('w-6 h-6 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex-shrink-0 flex items-center justify-center text-white text-xs', !showAvatar && 'invisible')}>
                          S
                        </div>
                      )}
                      <div className={cn('max-w-xs lg:max-w-md', isMe ? 'items-end' : 'items-start', 'flex flex-col gap-0.5')}>
                        <div className={isMe ? 'chat-bubble-sent' : 'chat-bubble-received'}>
                          {msg.type === 'text' && <p className="text-sm leading-relaxed">{msg.content}</p>}
                        </div>
                        <span className="text-xs text-gray-400 px-1">
                          {format(new Date(msg.createdAt), 'h:mm a')}
                          {isMe && <CheckCheck className="inline w-3 h-3 ml-1 text-primary-400" />}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))}

            {typingUsers.length > 0 && (
              <div className="flex items-end gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                <div className="chat-bubble-received">
                  <div className="flex gap-1 py-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <form onSubmit={sendMessage} className="flex items-end gap-2">
              <div className="flex items-center gap-1">
                <button type="button" className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 transition">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button type="button" className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 transition">
                  <Image className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Type a message..."
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white pr-10"
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(e as any)}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <Smile className="w-4 h-4" />
                </button>
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="w-10 h-10 bg-primary-600 text-white rounded-2xl flex items-center justify-center hover:bg-primary-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="text-center">
            <div className="w-20 h-20 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-primary-400" />
            </div>
            <p className="text-gray-500 font-medium">Select a conversation to start messaging</p>
            <p className="text-gray-400 text-sm mt-1">Or start a new chat with your scholars/guide</p>
          </div>
        </div>
      )}
    </div>
  );
}
