'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Brain, Sparkles, Copy, ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface Message { role: 'user' | 'assistant'; content: string; timestamp: Date; }

const QUICK_PROMPTS = [
  '📚 Help me write a research abstract',
  '🔬 Suggest methodology for my research',
  '📊 How to conduct a literature review',
  '✍️ Improve my thesis introduction',
  '📖 Citation and reference formats',
  '🎯 Create a research timeline',
  '💡 Research gap identification',
  '📄 Write a conference paper outline',
];

export default function AIAssistantPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello ${user?.firstName}! 👋 I'm your AI Academic Research Assistant. I can help you with:\n\n• **Research guidance** — methodology, literature reviews, gap analysis\n• **Writing assistance** — abstracts, introductions, conclusions\n• **Academic queries** — citations, formatting, publication guidance\n• **Research planning** — timelines, milestones, objectives\n\nHow can I assist you today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationHistory = useRef<{ role: string; content: string }[]>([]);

  const mutation = useMutation({
    mutationFn: (message: string) =>
      apiClient.post('/ai/assistant', {
        message,
        conversationHistory: conversationHistory.current.slice(-10),
        context: { userRole: user?.role },
      }),
    onSuccess: (res) => {
      const response = res.data.data.response;
      conversationHistory.current.push({ role: 'assistant', content: response });
      setMessages((prev) => [...prev, { role: 'assistant', content: response, timestamp: new Date() }]);
      setIsStreaming(false);
    },
    onError: () => {
      toast.error('AI assistant is temporarily unavailable');
      setIsStreaming(false);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMsg: Message = { role: 'user', content: content.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    conversationHistory.current.push({ role: 'user', content: content.trim() });
    setInput('');
    setIsStreaming(true);
    mutation.mutate(content.trim());
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const formatMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
      .replace(/\n• /g, '\n<span class="inline-block w-1.5 h-1.5 bg-primary-500 rounded-full mr-2 align-middle"></span>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem-3rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Academic Assistant</h1>
          <p className="text-xs text-gray-500">Powered by GPT-4 · Specialized for academic research</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Online
          </div>
          <button
            onClick={() => { setMessages([messages[0]]); conversationHistory.current = []; }}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition"
            title="New conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                msg.role === 'assistant'
                  ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                  : 'bg-gradient-to-br from-primary-400 to-primary-600'
              }`}>
                {msg.role === 'assistant'
                  ? <Sparkles className="w-4 h-4 text-white" />
                  : <span className="text-white text-xs font-bold">{user?.firstName?.[0]}</span>
                }
              </div>

              {/* Bubble */}
              <div className={`max-w-2xl ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-tr-sm'
                    : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm shadow-sm'
                }`}>
                  <div
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                    className="prose-sm max-w-none"
                  />
                </div>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => copyMessage(msg.content)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition">
                      <Copy className="w-3 h-3" />
                    </button>
                    <button className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition">
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition">
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                    <span className="text-xs text-gray-400 ml-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isStreaming && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
              <div className="flex gap-1 items-center h-5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="pb-3">
          <p className="text-xs text-gray-400 mb-2">Suggested prompts:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt.slice(2))}
                className="px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-gray-600 dark:text-gray-400 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Ask anything about your research, writing, or academic topics..."
            rows={1}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-gray-900 dark:text-white"
            style={{ minHeight: 48, maxHeight: 160 }}
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30 flex-shrink-0"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

      <p className="text-center text-xs text-gray-400 mt-2">
        AI responses are for guidance only. Always verify with your supervisor.
      </p>
    </div>
  );
}
