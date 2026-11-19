interface ClipboardLike {
  clipboard?: { writeText(text: string): Promise<void> };
}
interface DocumentLike {
  body: { appendChild(n: unknown): unknown; removeChild(n: unknown): unknown };
  createElement(tag: 'textarea'): { value: string; style: Record<string, string>; select(): void; setAttribute(k: string, v: string): void };
  execCommand(cmd: 'copy'): boolean;
}

/** Copia negli appunti con fallback a execCommand per contesti non sicuri (http://). */
export async function copyText(
  text: string,
  nav: ClipboardLike | undefined = typeof navigator !== 'undefined' ? navigator : undefined,
  doc: DocumentLike | null = typeof document !== 'undefined' ? (document as unknown as DocumentLike) : null,
): Promise<boolean> {
  try {
    if (nav?.clipboard) {
      await nav.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback sotto */
  }
  if (!doc) return false;
  try {
    const ta = doc.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    doc.body.appendChild(ta);
    ta.select();
    const ok = doc.execCommand('copy');
    doc.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
