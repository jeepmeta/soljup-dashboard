import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { motion } from 'motion/react';
import {
  loadAIWorkspace,
  saveAIWorkspace,
  type AIContext,
  type AIWorkspaceData,
  type McpConfig,
  type RFCFile,
  type SavedPythonScript,
  type SavedSkill,
  type SkillReference,
} from '../lib/aiWorkspace';
import type { AIConfig } from '../types';

type EditorModal = 'mcp' | 'skills' | 'scripts' | 'rules';

interface Props {
  aiConfig: AIConfig;
  onAIConfigChange: (config: AIConfig) => void;
  onContextChange: (context: AIContext) => void;
  hidden: boolean;
}

interface SkillDraft {
  id: string;
  name: string;
  description: string;
  instructions: string;
  evals: string;
  references: SkillReference[];
}

const EMPTY_SKILL: SkillDraft = {
  id: '',
  name: '',
  description: '',
  instructions: '',
  evals: '# Skill evaluations\n\nAdd repeatable checks for this skill.\n',
  references: [],
};
const EMPTY_SCRIPT = { id: '', name: '', code: '' };

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function parseSkill(skill: SavedSkill): SkillDraft {
  const match = skill.skill_md.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  const getYamlString = (key: string) => {
    const value = match?.[1].match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? '';
    try {
      return JSON.parse(value) as string;
    } catch {
      return value.replace(/^['"]|['"]$/g, '');
    }
  };
  return {
    id: skill.id,
    name: getYamlString('name') || skill.name,
    description: getYamlString('description'),
    instructions: match?.[2] ?? '',
    evals: skill.evals_md,
    references: skill.references.map((reference) => ({ ...reference })),
  };
}

function makeSkillMarkdown(draft: SkillDraft) {
  return [
    '---',
    `name: ${JSON.stringify(draft.name.trim())}`,
    `description: ${JSON.stringify(draft.description.trim())}`,
    '---',
    '',
    draft.instructions.trim(),
    '',
  ].join('\n');
}

function parseConfig(source: string): McpConfig {
  const parsed: unknown = JSON.parse(source);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('mcp.json must be a JSON object.');
  }
  const config = parsed as McpConfig;
  const servers = config.servers ?? config.mcpServers;
  if (!servers || typeof servers !== 'object' || Array.isArray(servers)) {
    throw new Error('Add a "servers" or "mcpServers" object to mcp.json.');
  }
  for (const [name, server] of Object.entries(servers)) {
    if (!server || typeof server !== 'object' || Array.isArray(server)) {
      throw new Error(`Server "${name}" needs a JSON object configuration.`);
    }
    if (typeof server.command !== 'string' && typeof server.url !== 'string') {
      throw new Error(`Server "${name}" needs a command or URL. Edit the server JSON before saving.`);
    }
  }
  return config;
}

function EditorDialog({
  title,
  description,
  error,
  onClose,
  children,
}: {
  title: string;
  description: string;
  error: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]')?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <dialog
      className="ai-editor-dialog"
      ref={dialogRef}
      aria-labelledby="ai-editor-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
      onClick={closeOnBackdrop}
    >
      <header className="ai-editor-heading">
        <div>
          <span className="eyebrow">AI workspace files</span>
          <h2 id="ai-editor-title">{title}</h2>
          <p>{description}</p>
        </div>
        <button type="button" className="ai-editor-close" aria-label="Close editor" data-dialog-initial-focus onClick={onClose}>
          Close
        </button>
      </header>
      {error && <p className="ai-workspace-feedback is-error" role="alert">{error}</p>}
      {children}
    </dialog>
  );
}

export function AIAssistantWorkspace({
  aiConfig,
  onAIConfigChange,
  onContextChange,
  hidden,
}: Props) {
  const [workspace, setWorkspace] = useState<AIWorkspaceData | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [selectedScriptId, setSelectedScriptId] = useState('');
  const [modal, setModal] = useState<EditorModal | null>(null);
  const [mcpText, setMcpText] = useState('{\n  "servers": {}\n}\n');
  const [skillDraft, setSkillDraft] = useState<SkillDraft>(EMPTY_SKILL);
  const [scriptDraft, setScriptDraft] = useState(EMPTY_SCRIPT);
  const [ruleDraft, setRuleDraft] = useState<RFCFile[]>([]);
  const [activeRule, setActiveRule] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedSkill = useMemo(
    () => workspace?.skills.find((skill) => skill.id === selectedSkillId) ?? null,
    [selectedSkillId, workspace?.skills],
  );
  const selectedScript = useMemo(
    () => workspace?.scripts.find((script) => script.id === selectedScriptId) ?? null,
    [selectedScriptId, workspace?.scripts],
  );

  const refresh = async () => {
    const current = await loadAIWorkspace();
    setWorkspace(current);
    setMcpText(`${JSON.stringify(current.mcp_config, null, 2)}\n`);
    setRuleDraft(current.rules.map((rule) => ({ ...rule })));
    setSelectedSkillId((previous) => current.skills.some((skill) => skill.id === previous)
      ? previous
      : current.skills[0]?.id ?? '');
    setSelectedScriptId((previous) => current.scripts.some((script) => script.id === previous)
      ? previous
      : '');
  };

  useEffect(() => {
    if (hidden) return;
    void refresh().catch((reason: unknown) => setError(messageFor(reason)));
  }, [hidden]);

  useEffect(() => {
    onContextChange({
      skill: selectedSkill,
      script: selectedScript,
      rules: workspace?.rules ?? [],
    });
  }, [onContextChange, selectedScript, selectedSkill, workspace?.rules]);

  const perform = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await operation();
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setBusy(false);
    }
  };

  const openEditor = (nextModal: EditorModal) => {
    setError('');
    setNotice('');
    if (nextModal === 'mcp') setMcpText(`${JSON.stringify(workspace?.mcp_config ?? { servers: {} }, null, 2)}\n`);
    if (nextModal === 'skills') setSkillDraft(EMPTY_SKILL);
    if (nextModal === 'scripts') setScriptDraft(EMPTY_SCRIPT);
    if (nextModal === 'rules') {
      setRuleDraft((workspace?.rules ?? []).map((rule) => ({ ...rule })));
      setActiveRule(0);
    }
    setModal(nextModal);
  };

  const saveMcp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void perform(async () => {
      const config = parseConfig(mcpText);
      const next = await saveAIWorkspace('save_mcp_config', { config });
      setWorkspace(next);
      setMcpText(`${JSON.stringify(next.mcp_config, null, 2)}\n`);
      setNotice('mcp.json saved in the local AI workspace.');
      setModal(null);
    });
  };

  const appendMcpServer = () => {
    try {
      const config = parseConfig(mcpText);
      const key = config.servers ? 'servers' : 'mcpServers';
      const servers = { ...config[key] };
      let name = 'my-mcp-server';
      let suffix = 2;
      while (servers[name]) name = `my-mcp-server-${suffix++}`;
      servers[name] = { type: 'stdio', command: 'npx', args: ['-y', 'your-mcp-package'] };
      setMcpText(`${JSON.stringify({ ...config, [key]: servers }, null, 2)}\n`);
      setError('');
    } catch (reason) {
      setError(messageFor(reason));
    }
  };

  const saveSkill = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void perform(async () => {
      const skillMd = makeSkillMarkdown(skillDraft);
      const next = await saveAIWorkspace('save_skill', {
        id: skillDraft.id || crypto.randomUUID(),
        name: skillDraft.name.trim(),
        skill_md: skillMd,
        evals_md: skillDraft.evals,
        references: skillDraft.references,
      });
      setWorkspace(next);
      setSelectedSkillId(next.skills.find((skill) => skill.name === skillDraft.name.trim())?.id ?? '');
      setNotice(`${skillDraft.name.trim()}/SKILL.md and its companion files were saved.`);
      setModal(null);
    });
  };

  const saveScript = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void perform(async () => {
      const next = await saveAIWorkspace('save_python_script', {
        id: scriptDraft.id || crypto.randomUUID(),
        name: scriptDraft.name,
        code: scriptDraft.code,
      });
      setWorkspace(next);
      setSelectedScriptId(next.scripts.find((script) => script.name === scriptDraft.name.trim())?.id ?? '');
      setNotice(`${scriptDraft.name.trim()}.py saved for manual review and AI context.`);
      setModal(null);
    });
  };

  const saveRules = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void perform(async () => {
      const next = await saveAIWorkspace('save_ai_rules', { rules: ruleDraft });
      setWorkspace(next);
      setNotice('The five RFC files were saved to the local rules folder.');
      setModal(null);
    });
  };

  const startNewSkill = () => setSkillDraft({ ...EMPTY_SKILL, references: [] });
  const editSkill = (skill: SavedSkill) => setSkillDraft(parseSkill(skill));
  const startNewScript = () => setScriptDraft({ ...EMPTY_SCRIPT });
  const editScript = (script: SavedPythonScript) => setScriptDraft({
    id: script.id,
    name: script.name,
    code: script.code,
  });

  const removeSkill = (skill: SavedSkill) => {
    void perform(async () => {
      const next = await saveAIWorkspace('delete_skill', { id: skill.id });
      setWorkspace(next);
      setNotice(`${skill.name} was removed from the local workspace.`);
    });
  };

  const removeScript = (script: SavedPythonScript) => {
    void perform(async () => {
      const next = await saveAIWorkspace('delete_python_script', { id: script.id });
      setWorkspace(next);
      setNotice(`${script.name}.py was removed from the local workspace.`);
    });
  };

  const addReference = () => {
    setSkillDraft((current) => ({
      ...current,
      references: [...current.references, { filename: '', content: '' }],
    }));
  };

  const updateReference = (index: number, update: Partial<SkillReference>) => {
    setSkillDraft((current) => ({
      ...current,
      references: current.references.map((reference, rowIndex) =>
        rowIndex === index ? { ...reference, ...update } : reference),
    }));
  };

  const updateRule = (index: number, content: string) => {
    setRuleDraft((current) => current.map((rule, rowIndex) =>
      rowIndex === index ? { ...rule, content } : rule));
  };

  return (
    <motion.section
      id="panel-ai"
      className="settings-workspace ai-workspace"
      role="tabpanel"
      aria-labelledby="tab-ai"
      tabIndex={0}
      hidden={hidden}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <header className="settings-page-header">
        <h1>AI Pup</h1>
        <p>Shape the assistant with local MCP configuration, skill files, scripts, and RFC guardrails.</p>
      </header>

      {error && !modal && <p className="ai-workspace-feedback is-error" role="alert">{error}</p>}
      {notice && <p className="ai-workspace-feedback is-success" role="status">{notice}</p>}

      <section className="panel ai-config-card">
        <div className="ai-config-heading">
          <div>
            <h2>Assistant endpoint</h2>
          </div>
          <span className="ai-local-pill">Config saved locally</span>
        </div>
        <div className="ai-config-fields">
          <div className="form-field">
            <label htmlFor="ai-base-url">Model base URL</label>
            <input id="ai-base-url" className="input" type="url" value={aiConfig.baseUrl}
              onChange={(event) => onAIConfigChange({ ...aiConfig, baseUrl: event.target.value })} />
          </div>
          <div className="form-field">
            <label htmlFor="ai-model">Model name</label>
            <input id="ai-model" className="input" value={aiConfig.model}
              onChange={(event) => onAIConfigChange({ ...aiConfig, model: event.target.value })} />
          </div>
        </div>
      </section>

      <section className="panel ai-config-card">
        <div className="ai-config-heading">
          <div>
            <h2>Choose what the assistant knows</h2>
          </div>
        </div>
        <div className="ai-context-grid">
          <div className="form-field">
            <label htmlFor="active-ai-skill">Skill</label>
            <select id="active-ai-skill" className="input" value={selectedSkillId}
              onChange={(event) => setSelectedSkillId(event.target.value)}>
              <option value="">No custom skill</option>
              {workspace?.skills.map((skill) => (
                <option key={skill.id} value={skill.id}>{skill.name}</option>
              ))}
            </select>
            <span className="field-hint">
              {selectedSkill
                ? `${selectedSkill.references.length} references · evaluation file included`
                : 'Select a saved skill to include its SKILL.md, evaluations and references.'}
            </span>
          </div>
          <div className="form-field">
            <label htmlFor="active-ai-script">Python script context</label>
            <select id="active-ai-script" className="input" value={selectedScriptId}
              onChange={(event) => setSelectedScriptId(event.target.value)}>
              <option value="">No script</option>
              {workspace?.scripts.map((script) => (
                <option key={script.id} value={script.id}>{script.name}</option>
              ))}
            </select>
            <span className="field-hint">Script code can be shared with the model for analysis; it is never executed by this feature.</span>
          </div>
        </div>
        <div className="ai-rules-context">
          <strong>Five RFC guardrails</strong>
          <span>{workspace?.rules.filter((rule) => rule.content.trim()).length ?? 0} files included with AI requests</span>
        </div>
      </section>

      <section className="panel ai-files-card">
        <div className="ai-files-heading">
          <div>
            <h2>AI workspace files</h2>
          </div>
        </div>
        <div className="ai-file-actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => openEditor('mcp')}>
            Edit mcp.json
          </button>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => openEditor('skills')}>
            Manage skills <span className="ai-action-count">{workspace?.skills.length ?? 0}</span>
          </button>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => openEditor('scripts')}>
            Python scripts <span className="ai-action-count">{workspace?.scripts.length ?? 0}</span>
          </button>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => openEditor('rules')}>
            Edit 5 RFC rules
          </button>
        </div>
        <div className="ai-file-path-list" aria-label="Workspace file layout">
          <span><code>mcp.json</code><small>MCP server configuration</small></span>
          <span><code>skills/&lt;skill&gt;/SKILL.md</code><small>Required YAML front-matter</small></span>
          <span><code>skills/&lt;skill&gt;/evals.md</code><small>Evaluation checks</small></span>
          <span><code>skills/&lt;skill&gt;/references/*.md</code><small>Optional skill references</small></span>
          <span><code>scripts/*.py</code><small>Stored only; never auto-executed</small></span>
          <span><code>rules/RFC-001.md … RFC-005.md</code><small>Five-part AI guardrail set</small></span>
        </div>
      </section>

      {modal === 'mcp' && (
        <EditorDialog title="mcp.json" description="Edit any MCP server entry. Review commands and environment values before you trust or start a server."
          error={error}
          onClose={() => setModal(null)}>
          <form className="ai-editor-form" onSubmit={saveMcp}>
            <div className="ai-editor-toolbar">
              <span>Supports VS Code <code>servers</code> and <code>mcpServers</code> formats</span>
              <button type="button" className="btn btn-quiet" onClick={appendMcpServer}>Add server template</button>
            </div>
            <label className="sr-only" htmlFor="mcp-json-content">MCP JSON configuration</label>
            <textarea id="mcp-json-content" className="input ai-code-editor ai-json-editor" spellCheck={false}
              value={mcpText} onChange={(event) => setMcpText(event.target.value)} />
            <p className="ai-editor-warning">MCP stdio servers may run local commands. Do not place wallet seed phrases or private keys in server configuration.</p>
            <footer className="ai-editor-footer">
              <button type="button" className="btn btn-quiet" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save mcp.json'}</button>
            </footer>
          </form>
        </EditorDialog>
      )}

      {modal === 'skills' && (
        <EditorDialog title="Skill library" description="Create multiple reusable skill folders. SKILL.md YAML front-matter, evals.md, and Markdown references are saved together."
          error={error}
          onClose={() => setModal(null)}>
          <div className="ai-editor-form">
            <div className="ai-library-picker">
              <label className="form-field">
                <span>Saved skill</span>
                <select className="input" value={skillDraft.id} onChange={(event) => {
                  const skill = workspace?.skills.find((item) => item.id === event.target.value);
                  if (skill) editSkill(skill);
                  else startNewSkill();
                }}>
                  <option value="">New skill</option>
                  {workspace?.skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
                </select>
              </label>
              {skillDraft.id && workspace?.skills.find((skill) => skill.id === skillDraft.id) && (
                <button type="button" className="text-button" disabled={busy}
                  onClick={() => {
                    const skill = workspace.skills.find((item) => item.id === skillDraft.id);
                    if (skill) removeSkill(skill);
                  }}>Delete skill</button>
              )}
            </div>
            <form className="ai-editor-form-inner" onSubmit={saveSkill}>
              <div className="ai-editor-fields">
                <div className="form-field">
                  <label htmlFor="skill-name">Skill name</label>
                  <input id="skill-name" className="input" required maxLength={64} value={skillDraft.name}
                    onChange={(event) => setSkillDraft((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <div className="form-field">
                  <label htmlFor="skill-description">YAML description</label>
                  <input id="skill-description" className="input" required maxLength={300} value={skillDraft.description}
                    onChange={(event) => setSkillDraft((current) => ({ ...current, description: event.target.value }))} />
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="skill-instructions">SKILL.md instructions</label>
                <textarea id="skill-instructions" className="input ai-code-editor" rows={8} required
                  value={skillDraft.instructions}
                  onChange={(event) => setSkillDraft((current) => ({ ...current, instructions: event.target.value }))} />
              </div>
              <div className="form-field">
                <label htmlFor="skill-evals">evals.md</label>
                <textarea id="skill-evals" className="input ai-code-editor" rows={4} required
                  value={skillDraft.evals}
                  onChange={(event) => setSkillDraft((current) => ({ ...current, evals: event.target.value }))} />
              </div>
              <div className="ai-references-heading">
                <div><strong>Reference files</strong><span>Each reference is saved as references/*.md.</span></div>
                <button type="button" className="btn btn-quiet" disabled={skillDraft.references.length >= 50} onClick={addReference}>Add reference</button>
              </div>
              {skillDraft.references.map((reference, index) => (
                <div className="ai-reference-editor" key={`${index}-${reference.filename}`}>
                  <div className="ai-reference-row">
                    <label className="form-field">
                      <span>Markdown filename</span>
                      <input className="input" required placeholder="guide.md"
                        value={reference.filename} onChange={(event) => updateReference(index, { filename: event.target.value })} />
                    </label>
                    <button type="button" className="text-button"
                      onClick={() => setSkillDraft((current) => ({
                        ...current,
                        references: current.references.filter((_item, rowIndex) => rowIndex !== index),
                      }))}>Remove</button>
                  </div>
                  <label className="sr-only" htmlFor={`skill-reference-${index}`}>Reference Markdown content</label>
                  <textarea id={`skill-reference-${index}`} className="input ai-code-editor" rows={3} required
                    value={reference.content}
                    onChange={(event) => updateReference(index, { content: event.target.value })} />
                </div>
              ))}
              <footer className="ai-editor-footer">
                <button type="button" className="btn btn-quiet" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save skill files'}</button>
              </footer>
            </form>
          </div>
        </EditorDialog>
      )}

      {modal === 'scripts' && (
        <EditorDialog title="Python script library" description="Name and store scripts for manual automation workflows or explicit AI context. Saving a script does not run it."
          error={error}
          onClose={() => setModal(null)}>
          <div className="ai-editor-form">
            <div className="ai-library-picker">
              <label className="form-field">
                <span>Saved script</span>
                <select className="input" value={scriptDraft.id} onChange={(event) => {
                  const script = workspace?.scripts.find((item) => item.id === event.target.value);
                  if (script) editScript(script);
                  else startNewScript();
                }}>
                  <option value="">New script</option>
                  {workspace?.scripts.map((script) => <option key={script.id} value={script.id}>{script.name}</option>)}
                </select>
              </label>
              {scriptDraft.id && workspace?.scripts.find((script) => script.id === scriptDraft.id) && (
                <button type="button" className="text-button" disabled={busy}
                  onClick={() => {
                    const script = workspace.scripts.find((item) => item.id === scriptDraft.id);
                    if (script) removeScript(script);
                  }}>Delete script</button>
              )}
            </div>
            <form className="ai-editor-form-inner" onSubmit={saveScript}>
              <div className="form-field">
                <label htmlFor="python-script-name">Script name</label>
                <input id="python-script-name" className="input" required maxLength={80} value={scriptDraft.name}
                  onChange={(event) => setScriptDraft((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="form-field">
                <label htmlFor="python-script-code">Python code</label>
                <textarea id="python-script-code" className="input ai-code-editor" rows={16} required spellCheck={false}
                  value={scriptDraft.code}
                  onChange={(event) => setScriptDraft((current) => ({ ...current, code: event.target.value }))} />
              </div>
              <p className="ai-editor-warning">Scripts are stored as .py files, selectable as AI context, and are never executed by this feature.</p>
              <footer className="ai-editor-footer">
                <button type="button" className="btn btn-quiet" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Python script'}</button>
              </footer>
            </form>
          </div>
        </EditorDialog>
      )}

      {modal === 'rules' && (
        <EditorDialog title="Five-part RFC ruleset" description="Edit each guardrail as its own RFC Markdown file. All five files are included in AI requests."
          error={error}
          onClose={() => setModal(null)}>
          <form className="ai-editor-form" onSubmit={saveRules}>
            <div className="ai-rfc-tabs" role="tablist" aria-label="RFC rule files">
              {ruleDraft.map((rule, index) => (
                <button key={rule.filename} type="button" role="tab"
                  id={`rfc-tab-${index}`}
                  aria-selected={activeRule === index}
                  aria-controls={`rfc-editor-${index}`}
                  onClick={() => setActiveRule(index)}>
                  {rule.filename.replace('.md', '')}
                </button>
              ))}
            </div>
            {ruleDraft[activeRule] && (
              <div className="form-field">
                <label htmlFor={`rfc-content-${activeRule}`}>{ruleDraft[activeRule].filename} · {ruleDraft[activeRule].title}</label>
                <textarea id={`rfc-content-${activeRule}`} className="input ai-code-editor ai-rfc-editor"
                  role="tabpanel" aria-labelledby={`rfc-tab-${activeRule}`} rows={16} required
                  value={ruleDraft[activeRule].content}
                  onChange={(event) => updateRule(activeRule, event.target.value)} />
              </div>
            )}
            <footer className="ai-editor-footer">
              <button type="button" className="btn btn-quiet" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy || ruleDraft.length !== 5}>
                {busy ? 'Saving…' : 'Save all five RFC files'}
              </button>
            </footer>
          </form>
        </EditorDialog>
      )}
    </motion.section>
  );
}
