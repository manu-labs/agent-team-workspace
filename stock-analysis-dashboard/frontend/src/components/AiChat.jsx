import { useState, useRef, useEffect } from 'react';
import { aiApi } from '../services/api';

export default function AiChat({ ticker }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Ask me anything about ' + ticker + '. I can analyze earnings reports, financial data, and recent news.' },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset messages when ticker changes
  useEffect(() => {
    setMessages([
      { role: 'assistant', content: 'Ask me anything about ' + ticker + '. I can analyze earnings reports, financial data, and recent news.' },
    ]);
    setInput('');
    setIsStreaming(false);
  }, [ticker]);

  const updateLastMessage = (content) => {
    setMessages((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = { role: 'assistant', content };
      return updated;
    });
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await aiApi.chat(ticker, text);

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const evt = JSON.parse(line.slice(6));
              if (evt.type === 'content' && evt.text) {
                fullText += evt.text;
                updateLastMessage(fullText);
              } else if (evt.type === 'error') {
                updateLastMessage(evt.message || 'An error occurred. Please try again.');
              }
              // 'start' and 'done' events are informational — no action needed
            } catch { /* skip malformed lines */ }
          }
        }

        // If we got no content at all, show a message
        if (!fullText) {
          updateLastMessage('No response received. The AI service may not be configured.');
        }
      } else {
        // Non-streaming fallback
        const data = await res.json().catch(() => ({}));
        if (data.error?.message) {
          updateLastMessage(data.error.message);
        } else {
          updateLastMessage(data.response || 'Sorry, I could not process your request.');
        }
      }
    } catch (err) {
      console.error('AI chat error:', err);
      updateLastMessage('Sorry, something went wrong. Please try again.');
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="card flex flex-col h-[500px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin">
        {messages.map((msg, i) => (
          <div key={i} className={"flex " + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={
                "max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap " +
                (msg.role === 'user'
                  ? "bg-brand-600 text-white"
                  : "bg-surface-700 text-surface-200")
              }
            >
              {msg.content || (
                <span className="inline-flex gap-1">
                  <span className="animate-pulse">\u2022</span>
                  <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>\u2022</span>
                  <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>\u2022</span>
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 border-t border-surface-700 pt-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={"Ask about " + ticker + "..."}
          disabled={isStreaming}
          className="flex-1 rounded-lg bg-surface-700 border border-surface-700 py-2.5 px-4 text-sm text-white placeholder-surface-200/40 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={isStreaming || !input.trim()}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:hover:bg-brand-600 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
