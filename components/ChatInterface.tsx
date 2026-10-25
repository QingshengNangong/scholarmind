
import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, User, Loader2 } from 'lucide-react';
import { ChatMessage, UILanguage } from '../types';
import { chatWithPaper } from '../services/geminiService';
import { GenerateContentResponse } from '@google/genai';

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  contextText: string;
  uiLanguage: UILanguage;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ isOpen, onClose, contextText, uiLanguage }) => {
  const strings = {
    en: {
      initialMsg: "Hello! I've analyzed the paper. Ask me anything about it.",
      title: "Paper Q&A",
      error: "Sorry, I encountered an error while processing your request.",
      placeholder: "Ask about methodology, results...",
    },
    zh: {
      initialMsg: "您好！我已经分析了这篇论文。您可以问我任何关于它的问题。",
      title: "论文问答",
      error: "抱歉，处理您的请求时出现错误。",
      placeholder: "询问关于方法论、结果...",
    },
    ko: {
      initialMsg: "안녕하세요! 논문 분석이 완료되었습니다. 궁금한 점이 있으면 무엇이든 물어보세요.",
      title: "논문 Q&A",
      error: "죄송합니다. 요청을 처리하는 중 오류가 발생했습니다.",
      placeholder: "방법론, 결과 등에 대해 질문하세요...",
    },
    ja: {
      initialMsg: "こんにちは！論文の分析が完了しました。何でも質問してください。",
      title: "論文 Q&A",
      error: "申し訳ありません。リクエストの処理中にエラーが発生しました。",
      placeholder: "方法論や結果について質問してください...",
    }
  };

  const t = strings[uiLanguage];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize/Update first message on language change if empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ id: '1', role: 'model', text: t.initialMsg, timestamp: Date.now() }]);
    }
  }, [uiLanguage, t.initialMsg]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Format history for the API
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }] as [{ text: string }]
      }));

      const stream = await chatWithPaper(history, userMsg.text, contextText, uiLanguage);
      
      let botResponseText = "";
      const botMsgId = (Date.now() + 1).toString();
      
      // Add placeholder for streaming
      setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: '', timestamp: Date.now() }]);

      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          botResponseText += c.text;
          setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: botResponseText } : m));
        }
      }

    } catch (error) {
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        text: t.error, 
        timestamp: Date.now() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl transform transition-transform duration-300 z-50 flex flex-col border-l border-stone-200">
      {/* Header */}
      <div className="p-5 border-b border-stone-200 flex justify-between items-center bg-[#fbfbfa]">
        <h3 className="font-serif font-medium flex items-center gap-3 text-stone-800">
          <Bot size={20} className="text-stone-500" strokeWidth={1.5} />
          {t.title}
        </h3>
        <button onClick={onClose} className="hover:bg-stone-100 p-2 rounded-full transition text-stone-400 hover:text-stone-600">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] rounded-2xl p-4 text-sm leading-loose shadow-sm font-serif ${
                msg.role === 'user' 
                  ? 'bg-stone-800 text-stone-50 rounded-br-none' 
                  : 'bg-[#fafaf9] text-stone-700 border border-stone-100 rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-[#fafaf9] p-4 rounded-2xl border border-stone-100 rounded-bl-none shadow-sm">
                <Loader2 className="animate-spin text-stone-400" size={16} />
             </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-5 bg-white border-t border-stone-100">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t.placeholder}
            className="flex-1 px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-200 text-sm bg-stone-50 placeholder:text-stone-400 font-serif"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
