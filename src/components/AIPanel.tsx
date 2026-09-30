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
  'STRUCTURE.SCAN',
  'PATTERN.FIND',
  'RISK.LEVELS',
  'ENTRY.PLAN',
  'BACKTEST.OUTLINE',
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
    onStatus('AI.THINK…');
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
          content: reply + (hints.length ? `\n\n[DETECTED: ${hints.join(', ').toUpperCase()}]` : ''),
          timestamp: Date.now(),
          coinContext: activeCoin?.id,
        },
      ]);
      onStatus(hints.length ? `AI · ${hints.join(' · ').toUpperCase()}` : 'AI.READY');
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `// ERR ${e.message || e}\n// ENSURE LM STUDIO @ ${config.baseUrl}`,
          timestamp: Date.now(),
        },
      ]);
      onStatus('AI.LINK.FAIL');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <span>AI.ANALYST</span>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 7, padding: '3px 8px' }}
          onClick={() => setShowSkills((v) => !v)}
        >
          SKILLS
        </button>
      </div>

      {showSkills && (
        <div
          style={{
            padding: 8,
            borderBottom: '1px solid var(--border)',
            fontSize: 13,
            fontFamily: 'var(--font-mono)',
          }}
        >
          <div className="text-muted" style={{ marginBottom: 4, fontFamily: 'var(--font-pixel)', fontSize: 7 }}>
            ACTIVE.SKILLS
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {config.skills.map((s) => (
              <span
                key={s}
                style={{
                  background: 'rgba(51,255,102,0.08)',
                  border: '1px solid var(--phosphor-dim)',
                  color: 'var(--phosphor)',
                  padding: '2px 6px',
                  fontSize: 12,
                }}
              >
                {s}
              </span>
            ))}
          </div>
          <div className="text-muted" style={{ margin: '8px 0 4px', fontFamily: 'var(--font-pixel)', fontSize: 7 }}>
            RULES
          </div>
          <ul style={{ paddingLeft: 14, color: 'var(--text-secondary)' }}>
            {config.rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <div className="text-muted" style={{ marginTop: 6, fontSize: 12 }}>
            {config.provider.toUpperCase()} · {config.baseUrl}
          </div>
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {messages.length === 0 && (
          <div className="text-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.5 }}>
            // LINK LM STUDIO @ <code>localhost:1234</code>
            <br />
            // SELECT TGT · QUERY STRUCTURE / PATTERNS / RISK
            <br />
            // AI MAY EMIT DRAWING LEVELS FOR CHART LAYER
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={m.role === 'user' ? 'msg-user' : 'msg-ai'}
            style={{ lineHeight: 1.45, whiteSpace: 'pre-wrap' }}
          >
            <span className="text-muted" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
              {m.role === 'user' ? '> USER' : '> AI'}
            </span>
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          padding: '6px 8px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          borderTop: '1px solid var(--border)',
        }}
      >
        {QUICK.map((q) => (
          <button
            key={q}
            className="btn btn-ghost"
            style={{ fontSize: 7, padding: '4px 7px' }}
            disabled={busy}
            onClick={() => send(q.replace(/\./g, ' ').toLowerCase())}
          >
            {q}
          </button>
        ))}
      </div>

      <div style={{ padding: 8, display: 'flex', gap: 6 }}>
        <input
          className="input"
          placeholder={activeCoin ? `QUERY ${activeCoin.symbol}…` : 'SELECT TGT OR QUERY…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          disabled={busy}
        />
        <button className="btn btn-cyan" onClick={() => send()} disabled={busy || !input.trim()}>
          {busy ? '…' : 'XMIT'}
        </button>
      </div>
    </div>
  );
}
