import { useState, useRef, useEffect } from 'react';
import { chatCompletion, extractPatternHints } from '../lib/ai';
import type { AIConfig, AIMessage, SavedCoin } from '../types';

interface Props {
  config: AIConfig;
  messages: AIMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AIMessage[]>>;
  activeCoin: SavedCoin | null;
  onStatus: (s: string) => void;
}

const QUICK = [
  'Analyze current structure',
  'Find patterns (H&S, cup-handle, Elliott)',
  'Risk / invalidation levels',
  'Suggest entry + stop plan',
  'Back-test idea outline',
];

export function AIPanel({ config, messages, setMessages, activeCoin, onStatus }: Props) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
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
    onStatus('AI thinking…');
    try {
      const ctx = activeCoin
        ? `${activeCoin.symbol} (${activeCoin.name}) mint=${activeCoin.id}`
        : undefined;
      const reply = await chatCompletion(config, next, ctx);
      const hints = extractPatternHints(reply);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: reply + (hints.length ? `\n\n[Detected: ${hints.join(', ')}]` : ''),
          timestamp: Date.now(),
          coinContext: activeCoin?.id,
        },
      ]);
      onStatus(hints.length ? `AI · patterns: ${hints.join(', ')}` : 'AI ready');
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ ${e.message || e}. Make sure LM Studio (or your OpenAI-compatible server) is running at ${config.baseUrl}`,
          timestamp: Date.now(),
        },
      ]);
      onStatus('AI connection failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <span>AI Analyst</span>
        <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setShowSkills((v) => !v)}>
          Skills / Rules
        </button>
      </div>

      {showSkills && (
        <div style={{ padding: 8, borderBottom: '1px solid var(--border-dim)', fontSize: 11 }}>
          <div className="text-muted" style={{ marginBottom: 4 }}>Active skills</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {config.skills.map((s) => (
              <span key={s} style={{ background: 'rgba(33,207,70,0.2)', border: '1px solid var(--accent-green)', borderRadius: 4, padding: '2px 6px' }}>
                {s}
              </span>
            ))}
          </div>
          <div className="text-muted" style={{ margin: '8px 0 4px' }}>Rules</div>
          <ul style={{ paddingLeft: 14, color: 'var(--text-secondary)' }}>
            {config.rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <div className="text-muted" style={{ marginTop: 6 }}>
            Provider: {config.provider} · {config.baseUrl}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div className="text-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
            Connect LM Studio (default <code style={{ color: 'var(--accent-cyan)' }}>localhost:1234</code>) in Settings.
            Select a coin, then ask for structure, patterns, or strategy ideas. AI can propose drawings and bot logic.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'msg-user' : 'msg-ai'} style={{ fontSize: 12, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '6px 8px', display: 'flex', flexWrap: 'wrap', gap: 4, borderTop: '1px solid var(--border-dim)' }}>
        {QUICK.map((q) => (
          <button key={q} className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 7px' }} disabled={busy} onClick={() => send(q)}>
            {q}
          </button>
        ))}
      </div>

      <div style={{ padding: 8, display: 'flex', gap: 6 }}>
        <input
          className="input"
          placeholder={activeCoin ? `Ask about ${activeCoin.symbol}…` : 'Select a coin or ask anything…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          disabled={busy}
        />
        <button className="btn btn-cyan" onClick={() => send()} disabled={busy || !input.trim()}>
          {busy ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
