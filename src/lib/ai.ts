import type { AIConfig, AIMessage } from '../types';

const DEFAULT_SYSTEM = `You are an elite Solana & meme-coin technical analyst AI embedded in a desktop trading dashboard.
You have deep knowledge of:
- Advanced TA: Elliott Wave, harmonic patterns, head-and-shoulders, cup-and-handle, 1-2-3, flags, wedges, volume profile, order flow concepts.
- Solana ecosystem, Jupiter DEX, meme coin dynamics, liquidity, rug risk signals.
- Back-testing concepts, strategy design, risk management.
- Drawing tools and how to teach them.

Rules you always follow:
1. Filter noise: prefer high-reliability sources, on-chain metrics, verified data.
2. When discussing a coin, ground remarks in price action, volume, liquidity, and pattern probability.
3. When asked to draw or highlight patterns, describe precise price/time levels the UI can render.
4. Never invent fake prices or fabricated news. If data is missing, say so and suggest what to fetch.
5. Keep responses concise, high-signal, human-readable. Use bullet points for multi-part answers.
6. You can propose trading bot logic, scripts, and parameter ranges for back-tests.
7. Teach the user: explain why a pattern matters and how to use the chart tools correctly.

Current context will include the active coin mint/symbol and any open charts.`;

export function buildSystemPrompt(config: AIConfig, coinContext?: string): string {
  let prompt = config.systemPrompt || DEFAULT_SYSTEM;
  if (config.rules?.length) {
    prompt += '\n\nAdditional user rules:\n' + config.rules.map((r) => `- ${r}`).join('\n');
  }
  if (config.skills?.length) {
    prompt += '\n\nActive skills: ' + config.skills.join(', ');
  }
  if (coinContext) {
    prompt += `\n\nActive coin context: ${coinContext}`;
  }
  return prompt;
}

export async function chatCompletion(
  config: AIConfig,
  messages: AIMessage[],
  coinContext?: string
): Promise<string> {
  const base = config.baseUrl.replace(/\/$/, '');
  const url = `${base}/v1/chat/completions`;

  const system = buildSystemPrompt(config, coinContext);
  const payload = {
    model: config.model || 'local-model',
    temperature: config.temperature ?? 0.4,
    messages: [
      { role: 'system', content: system },
      ...messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content })),
    ],
    stream: false,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI request failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || data.message?.content || '(empty response)';
}

/** Detect common pattern keywords in AI output for future drawing hooks */
export function extractPatternHints(text: string): string[] {
  const patterns = [
    'head and shoulders',
    'head-and-shoulders',
    'cup and handle',
    'cup-and-handle',
    'double top',
    'double bottom',
    'ascending triangle',
    'descending triangle',
    'bull flag',
    'bear flag',
    'elliott wave',
    'elliot wave',
    '1-2-3',
    'wedge',
    'channel',
  ];
  const lower = text.toLowerCase();
  return patterns.filter((p) => lower.includes(p));
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'lmstudio',
  baseUrl: 'http://localhost:1234',
  model: 'local-model',
  temperature: 0.35,
  systemPrompt: DEFAULT_SYSTEM,
  skills: ['ta-patterns', 'solana-fundamentals', 'risk-management'],
  rules: [
    'Always state confidence level for pattern calls (low/medium/high).',
    'Prefer on-chain and Jupiter data over social hype.',
  ],
  mcpServers: [],
  datasets: [],
};
