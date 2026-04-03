/**
 * NotebookLM CLI integration — uses browser-cookie auth, no API key required.
 *
 * The CLI is installed via `notebooklm-py[browser]` and authenticates through
 * a persisted Playwright session at ~/.notebooklm/storage_state.json.
 *
 * Resolution order for the `notebooklm` executable:
 *   1. .venv/Scripts/notebooklm.exe  (Windows project venv)
 *   2. ~/.notebooklm-venv/bin/notebooklm  (Unix SKILL.md setup venv)
 *   3. notebooklm on system PATH
 */

import { execFile } from 'child_process'
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { tmpdir, homedir } from 'os'
import { join } from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const NLM_TIMEOUT_MS = 75_000

// ── Executable resolution ──────────────────────────────────────────────────

function resolveNotebookLmBin(): string {
  const candidates = [
    join(process.cwd(), '.venv', 'Scripts', 'notebooklm.exe'), // Windows project venv
    join(homedir(), '.notebooklm-venv', 'bin', 'notebooklm'), // Unix SKILL venv
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  // Fall back to PATH lookup — execFile will throw if not found
  return 'notebooklm'
}

// ── Low-level spawn wrapper ────────────────────────────────────────────────

async function execNlm(args: string[], timeoutMs = NLM_TIMEOUT_MS): Promise<string> {
  const bin = resolveNotebookLmBin()
  const { stdout } = await execFileAsync(bin, args, {
    timeout: timeoutMs,
    maxBuffer: 4 * 1024 * 1024, // 4 MB
  })
  return stdout
}

// ── Parsing helpers ────────────────────────────────────────────────────────

/**
 * Extracts a notebook ID from `notebooklm create` output.
 * The CLI prints something like:  Created notebook abc123
 */
function parseNotebookId(output: string): string {
  const match = output.match(/\b([a-f0-9]{8,})\b/i) ?? output.match(/notebook[:\s]+(\S+)/i)
  if (!match) {
    throw new Error(`Cannot parse notebook ID from output: ${output.trim().slice(0, 200)}`)
  }
  return match[1]
}

/**
 * Extracts a source ID from `notebooklm source add-research` or
 * `notebooklm source add` output.
 * The CLI prints something like:  Added source src_abc123
 */
function parseSourceId(output: string): string {
  const match =
    output.match(/source[_\s]id[:\s]+(\S+)/i) ??
    output.match(/\b(src_[a-z0-9_]+)\b/i) ??
    output.match(/Added source\s+(\S+)/i) ??
    output.match(/\b([a-f0-9-]{12,})\b/)
  if (!match) {
    throw new Error(`Cannot parse source ID from output: ${output.trim().slice(0, 200)}`)
  }
  return match[1]
}

/**
 * Extracts the answer text from `notebooklm ask --json` output.
 * The --json flag wraps the response as: {"answer": "...", "sources": [...]}
 */
function parseAskAnswer(output: string): string {
  try {
    const parsed = JSON.parse(output.trim()) as unknown
    if (typeof parsed === 'object' && parsed !== null && 'answer' in parsed) {
      const answer = (parsed as Record<string, unknown>).answer
      if (typeof answer === 'string') {
        return answer
      }
    }
  } catch {
    // not JSON — fall through to raw text
  }
  // Return raw stdout as-is; the caller will pass it through the AI prompt
  return output.trim()
}

// ── Temporary file helper ──────────────────────────────────────────────────

function writeTmpSourceFile(content: string): string {
  const dir = tmpdir()
  mkdirSync(dir, { recursive: true })
  const filePath = join(dir, `nlm-source-${Date.now()}.txt`)
  writeFileSync(filePath, content, 'utf8')
  return filePath
}

function removeTmpFile(filePath: string): void {
  try {
    unlinkSync(filePath)
  } catch {
    // non-critical — best-effort cleanup
  }
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Runs a full NotebookLM research workflow for a given topic and returns
 * the raw answer text from NotebookLM.  The caller is responsible for
 * structuring the answer into a typed result (e.g. via Claude).
 *
 * Workflow:
 *   1. Create ephemeral notebook
 *   2. Add web research source (topic query)
 *   3. Wait for source to become READY
 *   4. Optionally add sourceText as a document source
 *   5. Ask NotebookLM to synthesise all fields
 *   6. Delete the notebook (fire-and-forget)
 *   7. Return raw answer
 *
 * @throws if the CLI is not installed / not authenticated / times out
 */
export async function runNotebookLmCliResearch(
  topic: string,
  sourceText?: string
): Promise<string> {
  let notebookId: string | null = null
  let tmpFile: string | null = null

  try {
    // 1. Create ephemeral notebook
    const createOut = await execNlm(['create', `Deep Research: ${topic}`])
    notebookId = parseNotebookId(createOut)

    // 2. Set notebook context
    await execNlm(['use', notebookId])

    // 3. Add web research source
    const researchOut = await execNlm(['source', 'add-research', topic])
    const researchSourceId = parseSourceId(researchOut)

    // 4. Wait for research source to be ready
    await execNlm(['source', 'wait', researchSourceId], NLM_TIMEOUT_MS)

    // 5. Optionally add sourceText as a document
    if (sourceText && sourceText.trim().length > 0) {
      tmpFile = writeTmpSourceFile(sourceText)
      const addOut = await execNlm(['source', 'add', tmpFile])
      const docSourceId = parseSourceId(addOut)
      await execNlm(['source', 'wait', docSourceId], NLM_TIMEOUT_MS)
    }

    // 6. Ask for structured synthesis
    const question =
      `Synthesise all sources into a comprehensive research report. ` +
      `Return plain text covering: executive summary, key findings, statistics, ` +
      `expert insights, case studies, controversies, emerging trends, knowledge gaps, ` +
      `and source URLs. Be detailed and evidence-based.`

    const askOut = await execNlm(['ask', question, '--json'])
    return parseAskAnswer(askOut)
  } finally {
    // 7. Delete notebook — fire-and-forget; errors must not mask research results
    if (notebookId) {
      execNlm(['delete', notebookId, '--yes']).catch(() => {})
    }
    if (tmpFile) {
      removeTmpFile(tmpFile)
    }
  }
}
