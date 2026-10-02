import { isTauri } from '@tauri-apps/api/core';
import { tradingCommand } from './backtesting';

export interface McpConfig {
  servers?: Record<string, Record<string, unknown>>;
  mcpServers?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

export interface SkillReference {
  filename: string;
  content: string;
}

export interface SavedSkill {
  id: string;
  name: string;
  slug: string;
  skill_md: string;
  evals_md: string;
  references: SkillReference[];
  updated_at: string;
}

export interface SavedPythonScript {
  id: string;
  name: string;
  slug: string;
  code: string;
  updated_at: string;
}

export interface RFCFile {
  filename: string;
  title: string;
  content: string;
  updated_at: string;
}

export interface AIWorkspaceData {
  workspace_path: string;
  mcp_config: McpConfig;
  skills: SavedSkill[];
  scripts: SavedPythonScript[];
  rules: RFCFile[];
}

export interface AIContext {
  skill: SavedSkill | null;
  script: SavedPythonScript | null;
  rules: RFCFile[];
}

const STORAGE_KEY = 'sjd-ai-workspace-v1';
const RFC_TITLES = [
  ['RFC-001.md', 'Purpose and Scope'],
  ['RFC-002.md', 'Evidence and Sources'],
  ['RFC-003.md', 'Risk and Safety'],
  ['RFC-004.md', 'Response Format'],
  ['RFC-005.md', 'Change Control'],
];

function defaultWorkspace(): AIWorkspaceData {
  return {
    workspace_path: 'Browser-local storage (use the desktop app for Markdown file export)',
    mcp_config: { servers: {} },
    skills: [],
    scripts: [],
    rules: RFC_TITLES.map(([filename, title]) => ({
      filename,
      title,
      content: `# ${title}\n\n`,
      updated_at: new Date(0).toISOString(),
    })),
  };
}

export async function loadAIWorkspace(): Promise<AIWorkspaceData> {
  if (isTauri()) return tradingCommand<AIWorkspaceData>('get_ai_workspace');
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultWorkspace();
  const parsed: unknown = JSON.parse(stored);
  if (!parsed || typeof parsed !== 'object') throw new Error('Saved AI workspace is not a valid object.');
  return { ...defaultWorkspace(), ...(parsed as Partial<AIWorkspaceData>) };
}

export async function saveAIWorkspace(
  action: Exclude<
    Parameters<typeof tradingCommand>[0],
    'dashboard' | 'save_bot' | 'import_csv' | 'run_backtest' | 'optimize' | 'save_ai_review'
  >,
  payload: object,
): Promise<AIWorkspaceData> {
  if (isTauri()) return tradingCommand<AIWorkspaceData>(action, payload);
  const current = await loadAIWorkspace();
  let updated = current;
  if (action === 'save_mcp_config') {
    updated = { ...current, mcp_config: (payload as { config: McpConfig }).config };
  } else if (action === 'save_skill') {
    const skill = payload as Omit<SavedSkill, 'updated_at' | 'slug'> & { slug?: string };
    const saved: SavedSkill = {
      ...skill,
      slug: skill.slug ?? skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      updated_at: new Date().toISOString(),
    };
    updated = {
      ...current,
      skills: [...current.skills.filter((item) => item.id !== saved.id), saved],
    };
  } else if (action === 'delete_skill') {
    const id = (payload as { id: string }).id;
    updated = { ...current, skills: current.skills.filter((item) => item.id !== id) };
  } else if (action === 'save_python_script') {
    const script = payload as Omit<SavedPythonScript, 'updated_at' | 'slug'> & { slug?: string };
    const saved: SavedPythonScript = {
      ...script,
      slug: script.slug ?? script.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      updated_at: new Date().toISOString(),
    };
    updated = {
      ...current,
      scripts: [...current.scripts.filter((item) => item.id !== saved.id), saved],
    };
  } else if (action === 'delete_python_script') {
    const id = (payload as { id: string }).id;
    updated = { ...current, scripts: current.scripts.filter((item) => item.id !== id) };
  } else if (action === 'save_ai_rules') {
    const rules = (payload as { rules: RFCFile[] }).rules.map((rule) => ({
      ...rule,
      updated_at: new Date().toISOString(),
    }));
    updated = { ...current, rules };
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

