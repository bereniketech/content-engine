import dns from 'node:dns/promises';
import { createClient } from '@/lib/supabase/server';

const TOP_PROVIDERS = [
  'gmail.com','yahoo.com','outlook.com','hotmail.com','icloud.com',
  'protonmail.com','aol.com','live.com','msn.com','ymail.com',
];

const RFC_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(
        dp[j] + 1,        // deletion
        dp[j - 1] + 1,    // insertion
        prev + cost,      // substitution
      );
      prev = tmp;
    }
  }
  return dp[n];
}

export function suggestDomain(domain: string): string | null {
  let best = { dist: Infinity, match: '' };
  for (const p of TOP_PROVIDERS) {
    const d = levenshtein(domain, p);
    if (d < best.dist && d <= 2) best = { dist: d, match: p };
  }
  return best.match || null;
}

export type EmailValidationResult = {
  valid: boolean;
  mx: boolean;
  disposable: boolean;
  suggestion: string | null;
  domain_reputation_score: number;
};

export async function validateEmail(email: string): Promise<EmailValidationResult> {
  if (!email || !RFC_RE.test(email)) {
    return { valid: false, mx: false, disposable: false, suggestion: null, domain_reputation_score: 0 };
  }
  const domain = email.split('@')[1].toLowerCase();
  const supabase = createClient();

  const { data: blocked } = await supabase
    .from('email_domain_blocklist')
    .select('id')
    .eq('domain', domain)
    .maybeSingle();
  const disposable = !!blocked;

  let mx = false;
  try {
    const records = await dns.resolveMx(domain);
    mx = Array.isArray(records) && records.length > 0;
  } catch {
    mx = false;
  }

  const suggestion = suggestDomain(domain);
  const finalSuggestion = suggestion && suggestion !== domain ? suggestion : null;

  const domain_reputation_score =
    disposable ? 0 :
    !mx        ? 10 :
    TOP_PROVIDERS.includes(domain) ? 90 : 60;

  return {
    valid: true,
    mx,
    disposable,
    suggestion: finalSuggestion,
    domain_reputation_score,
  };
}
