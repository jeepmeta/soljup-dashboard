import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DoginalCompanionWindow } from './DoginalCompanionWindow';
import { chatCompletion, extractPatternHints } from '../lib/ai';
import type { AIConfig, AIMessage, SavedCoin } from '../types';

interface Props {
  config: AIConfig;
  messages: AIMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AIMessage[]>>;
  activeCoin: SavedCoin | null;
  onStatus: (s: string) => void;
}

const QUICK_PROMPTS = [
  { label: 'Market structure', prompt: 'Scan the market structure' },
  { label: 'Find patterns', prompt: 'Find relevant chart patterns' },
  { label: 'Risk levels', prompt: 'Identify potential risk levels' },
  { label: 'Entry plan', prompt: 'Outline a cautious entry plan' },
  { label: 'Backtest idea', prompt: 'Suggest a backtest outline' },
];

export function AIPanel({ config, messages, setMessages, activeCoin, onStatus }: Props) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const userMsg: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
      coinContext: activeCoin?.id,
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setBusy(true);
    onStatus('Analyzing question…');
    try {
      const ctx = activeCoin
        ? `${activeCoin.symbol} (${activeCoin.name}) mint=${activeCoin.id}`
        : undefined;
      const reply = await chatCompletion(config, next, ctx);
      const hints = extractPatternHints(reply);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: reply + (hints.length ? `\n\n[DETECTED: ${hints.join(', ').toUpperCase()}]` : ''),
          timestamp: Date.now(),
          coinContext: activeCoin?.id,
        },
      ]);
      onStatus(hints.length ? `Analysis ready · ${hints.join(', ')}` : 'AI analysis ready');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Unable to reach the AI service: ${message}\nCheck that your model is running at ${config.baseUrl}.`,
          timestamp: Date.now(),
        },
      ]);
      onStatus('AI connection failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel ai-panel">
      <div className="panel-header ai-panel-heading">
        <div>
          <h2>AI Pup</h2>
        </div>
        <DoginalCompanionWindow />
      </div>

      <div className="conversation" aria-label="AI conversation">
        {messages.length === 0 && (
          <div className="assistant-welcome">
            <span className="assistant-avatar" aria-hidden="true">AI</span>
            <div>
              <strong>Ready when you are.</strong>
              <p>
                {activeCoin
                  ? `Ask a question about ${activeCoin.symbol}, or choose a prompt below.`
                  : 'Select a token to add context, or ask a general market question.'}
              </p>
              <span className="connection-hint">Configure your model in the AI Assistant tab to get started.</span>
            </div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              className={`message-bubble ${message.role === 'user' ? 'message-user' : 'message-assistant'}`}
              initial={{ opacity: 0, y: 8, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <span className="message-author">{message.role === 'user' ? 'You' : 'AI analyst'}</span>
              <div>{message.content}</div>
            </motion.div>
          ))}
        </AnimatePresence>
        {busy && (
          <motion.div
            className="thinking-indicator"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            aria-live="polite"
          >
            <span className="thinking-dots" aria-hidden="true"><i /><i /><i /></span>
            Thinking through your question…
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="prompt-area">
        <span className="prompt-label">Try a quick prompt</span>
        <div className="quick-prompts">
          {QUICK_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              className="prompt-chip"
              disabled={busy}
              onClick={() => send(item.prompt)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
        <label className="sr-only" htmlFor="analyst-question">Ask the AI analyst</label>
        <input
          id="analyst-question"
          className="input"
          placeholder={activeCoin ? `Ask about ${activeCoin.symbol}…` : 'Ask a market question…'}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={busy}
        />
        <button type="submit" className="btn btn-primary send-button" disabled={busy || !input.trim()}>
          {busy ? 'Sending…' : 'Send'}
        </button>
      </form>
    </section>
  );
}
