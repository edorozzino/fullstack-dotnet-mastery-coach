import hljs from 'highlight.js/lib/core';
import csharp from 'highlight.js/lib/languages/csharp';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import type { CodeLang } from '../domain/types';

hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('dockerfile', dockerfile);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);

const MAP: Record<CodeLang, string | null> = {
  csharp: 'csharp',
  typescript: 'typescript',
  tsx: 'typescript',
  javascript: 'javascript',
  html: 'xml',
  sql: 'sql',
  yaml: 'yaml',
  dockerfile: 'dockerfile',
  bash: 'bash',
  json: 'json',
  text: null,
};

export const LANG_LABEL: Record<CodeLang, string> = {
  csharp: 'C#', typescript: 'TypeScript', tsx: 'TSX', javascript: 'JavaScript', html: 'HTML / Template',
  sql: 'SQL', yaml: 'YAML', dockerfile: 'Dockerfile', bash: 'Shell', json: 'JSON', text: 'Testo',
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Restituisce HTML sicuro (highlight.js esegue sempre l'escape del sorgente). */
export function highlight(code: string, lang: CodeLang): string {
  const language = MAP[lang];
  if (!language) return escapeHtml(code);
  try {
    return hljs.highlight(code, { language, ignoreIllegals: true }).value;
  } catch {
    return escapeHtml(code);
  }
}
