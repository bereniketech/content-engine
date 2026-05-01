import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { resolveWallet, deductCredits } from '@/lib/credits/wallet';
import { getCreditCost } from '@/lib/config/credit-costs';
import crypto from 'crypto';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export type GenerateResult = {
  result: string;
  credits_remaining: number;
  request_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
};

export async function generateWithDeduction(
  userId: string,
  actionType: string,
  prompt: string,
  options: Record<string, unknown> = {}
): Promise<GenerateResult> {
  const requestId = crypto.randomUUID();
  const cost = getCreditCost(actionType);

  const wallet = await resolveWallet(userId);
  if (!wallet) throw Object.assign(new Error('Wallet not found.'), { status: 402 });
  if (wallet.balance < cost) {
    throw Object.assign(new Error('Insufficient credits. Please top up to continue.'), { status: 402 });
  }

  const balanceAfterDeduct = await deductCredits(wallet.id, cost, actionType, requestId, userId);

  const start = Date.now();
  let result: string;
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: (options.max_tokens as number) ?? 2048,
      messages: [{ role: 'user', content: prompt }],
    });
    result = response.content[0].type === 'text' ? response.content[0].text : '';
    promptTokens = response.usage.input_tokens;
    completionTokens = response.usage.output_tokens;
  } catch (aiError) {
    await getSupabase().rpc('fn_refund_credits', { p_request_id: requestId });

    await getSupabase().from('generation_log').insert({
      user_id: userId,
      action_type: actionType,
      model_used: 'claude-sonnet-4-6',
      prompt_tokens: 0,
      completion_tokens: 0,
      latency_ms: Date.now() - start,
      status: 'failed',
      request_id: requestId,
      error: String(aiError),
    }).then(null, () => {});

    throw aiError;
  }

  const latencyMs = Date.now() - start;

  await getSupabase().from('generation_log').insert({
    user_id: userId,
    action_type: actionType,
    model_used: 'claude-sonnet-4-6',
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    latency_ms: latencyMs,
    status: 'success',
    request_id: requestId,
  }).then(null, () => {});

  return {
    result,
    credits_remaining: balanceAfterDeduct,
    request_id: requestId,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    latency_ms: latencyMs,
  };
}
