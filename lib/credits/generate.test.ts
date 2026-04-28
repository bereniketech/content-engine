const mockSupabase = {
  rpc: jest.fn(),
  from: jest.fn(),
}

const mockAnthropic = {
  messages: {
    create: jest.fn(),
  },
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}))

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn(() => mockAnthropic)
})

jest.mock('@/lib/credits/wallet', () => ({
  resolveWallet: jest.fn(),
  deductCredits: jest.fn(),
}))

jest.mock('@/lib/config/credit-costs', () => ({
  getCreditCost: jest.fn(),
}))

import { generateWithDeduction, type GenerateResult } from './generate'
import { resolveWallet, deductCredits } from '@/lib/credits/wallet'
import { getCreditCost } from '@/lib/config/credit-costs'

describe('generateWithDeduction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCreditCost as jest.Mock).mockReturnValue(10);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy path: successful generation and credit deduction', () => {
    it('deducts credits and generates content successfully', async () => {
      const userId = 'user-123';
      const actionType = 'content.generate.short';
      const prompt = 'Write a short article';
      const walletId = 'wallet-123';

      (resolveWallet as jest.Mock).mockResolvedValue({
        id: walletId,
        balance: 100,
        owner_kind: 'user',
      });

      (deductCredits as jest.Mock).mockResolvedValue(90);

      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Generated content here' }],
        usage: {
          input_tokens: 50,
          output_tokens: 150,
        },
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await generateWithDeduction(userId, actionType, prompt);

      expect(result).toEqual(
        expect.objectContaining({
          result: 'Generated content here',
          credits_remaining: 90,
          prompt_tokens: 50,
          completion_tokens: 150,
        })
      );
      expect(result.request_id).toBeDefined();
      expect(result.latency_ms).toBeGreaterThanOrEqual(0);

      expect(resolveWallet).toHaveBeenCalledWith(userId);
      expect(deductCredits).toHaveBeenCalledWith(walletId, 10, actionType, result.request_id, userId);
      expect(mockAnthropic.messages.create).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('generation_log');
    });

    it('logs generation with correct timestamp, token count, and latency', async () => {
      const userId = 'user-123';
      const actionType = 'content.generate.short';
      const prompt = 'Write a short article';
      const walletId = 'wallet-123';
      const requestId = 'req-456';

      (resolveWallet as jest.Mock).mockResolvedValue({
        id: walletId,
        balance: 100,
        owner_kind: 'user',
      });

      (deductCredits as jest.Mock).mockResolvedValue(90);

      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Generated content' }],
        usage: {
          input_tokens: 100,
          output_tokens: 200,
        },
      });

      const insertMock = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: insertMock,
      });

      const result = await generateWithDeduction(userId, actionType, prompt);

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          action_type: actionType,
          model_used: 'claude-sonnet-4-6',
          prompt_tokens: 100,
          completion_tokens: 200,
          latency_ms: expect.any(Number),
          status: 'success',
          request_id: result.request_id,
        })
      );
      expect(result.latency_ms).toBeGreaterThanOrEqual(0);
    });

    it('works with different credit amounts', async () => {
      const userId = 'user-456';
      const walletId = 'wallet-456';

      const testCases = [
        { actionType: 'content.generate.short', cost: 5 },
        { actionType: 'content.generate.long', cost: 15 },
        { actionType: 'content.image.generate', cost: 25 },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();

        (getCreditCost as jest.Mock).mockReturnValue(testCase.cost);
        (resolveWallet as jest.Mock).mockResolvedValue({
          id: walletId,
          balance: 100,
          owner_kind: 'user',
        });

        (deductCredits as jest.Mock).mockResolvedValue(100 - testCase.cost);

        mockAnthropic.messages.create.mockResolvedValue({
          content: [{ type: 'text', text: 'Content' }],
          usage: { input_tokens: 10, output_tokens: 20 },
        });

        mockSupabase.from.mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: null }),
        });

        const result = await generateWithDeduction(userId, testCase.actionType, 'Prompt');

        expect(deductCredits).toHaveBeenCalledWith(
          walletId,
          testCase.cost,
          testCase.actionType,
          result.request_id,
          userId
        );
        expect(result.credits_remaining).toBe(100 - testCase.cost);
      }
    });
  });

  describe('Insufficient credits error path', () => {
    it('returns 402 error when user has no credits', async () => {
      const userId = 'user-123';
      const actionType = 'content.generate.short';
      const prompt = 'Write a short article';

      (resolveWallet as jest.Mock).mockResolvedValue({
        id: 'wallet-123',
        balance: 0,
        owner_kind: 'user',
      });

      await expect(generateWithDeduction(userId, actionType, prompt)).rejects.toMatchObject({
        message: 'Insufficient credits. Please top up to continue.',
        status: 402,
      });

      expect(deductCredits).not.toHaveBeenCalled();
      expect(mockAnthropic.messages.create).not.toHaveBeenCalled();
    });

    it('returns 402 error when user has insufficient credits', async () => {
      const userId = 'user-123';
      const actionType = 'content.generate.long';
      const prompt = 'Write a long article';

      (getCreditCost as jest.Mock).mockReturnValue(15);
      (resolveWallet as jest.Mock).mockResolvedValue({
        id: 'wallet-123',
        balance: 10, // less than cost of 15
        owner_kind: 'user',
      });

      await expect(generateWithDeduction(userId, actionType, prompt)).rejects.toMatchObject({
        message: 'Insufficient credits. Please top up to continue.',
        status: 402,
      });

      expect(deductCredits).not.toHaveBeenCalled();
      expect(mockAnthropic.messages.create).not.toHaveBeenCalled();
    });

    it('returns 402 error when wallet not found', async () => {
      const userId = 'user-123';

      (resolveWallet as jest.Mock).mockResolvedValue(null);

      await expect(generateWithDeduction(userId, 'content.generate.short', 'Prompt')).rejects.toMatchObject({
        message: 'Wallet not found.',
        status: 402,
      });

      expect(deductCredits).not.toHaveBeenCalled();
      expect(mockAnthropic.messages.create).not.toHaveBeenCalled();
    });
  });

  describe('AI failure and refund flow', () => {
    it('refunds credits when AI fails after deduction', async () => {
      const userId = 'user-123';
      const actionType = 'content.generate.short';
      const prompt = 'Write a short article';
      const walletId = 'wallet-123';
      const requestId = 'req-789';

      (resolveWallet as jest.Mock).mockResolvedValue({
        id: walletId,
        balance: 100,
        owner_kind: 'user',
      });

      (deductCredits as jest.Mock).mockResolvedValue(90);

      const aiError = new Error('API rate limit exceeded');
      mockAnthropic.messages.create.mockRejectedValue(aiError);

      mockSupabase.rpc.mockResolvedValue({ error: null });

      const insertMock = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: insertMock,
      });

      await expect(generateWithDeduction(userId, actionType, prompt)).rejects.toThrow(aiError);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('fn_refund_credits', {
        p_request_id: expect.any(String),
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          action_type: actionType,
          status: 'failed',
          error: String(aiError),
          prompt_tokens: 0,
          completion_tokens: 0,
        })
      );
    });

    it('logs generation failure with latency when AI fails', async () => {
      const userId = 'user-123';
      const walletId = 'wallet-123';

      (resolveWallet as jest.Mock).mockResolvedValue({
        id: walletId,
        balance: 100,
        owner_kind: 'user',
      });

      (deductCredits as jest.Mock).mockResolvedValue(90);

      const aiError = new Error('Model unavailable');
      mockAnthropic.messages.create.mockRejectedValue(aiError);

      mockSupabase.rpc.mockResolvedValue({ error: null });

      const insertMock = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: insertMock,
      });

      await expect(generateWithDeduction(userId, 'content.generate.short', 'Prompt')).rejects.toThrow();

      const failureLog = insertMock.mock.calls.find(
        (call) => Array.isArray(call[0]) || call[0].status === 'failed'
      ) || insertMock.mock.calls[0];

      expect(failureLog[0]).toMatchObject({
        status: 'failed',
        latency_ms: expect.any(Number),
      });
      expect(failureLog[0].latency_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Refund RPC failure and alerting', () => {
    it('handles refund RPC error gracefully and logs it', async () => {
      const userId = 'user-123';
      const walletId = 'wallet-123';
      const rpcError = new Error('RPC call failed');

      (resolveWallet as jest.Mock).mockResolvedValue({
        id: walletId,
        balance: 100,
        owner_kind: 'user',
      });

      (deductCredits as jest.Mock).mockResolvedValue(90);

      const aiError = new Error('AI processing failed');
      mockAnthropic.messages.create.mockRejectedValue(aiError);

      mockSupabase.rpc.mockRejectedValue(rpcError);

      const insertMock = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: insertMock,
      });

      await expect(generateWithDeduction(userId, 'content.generate.short', 'Prompt')).rejects.toThrow(aiError);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('fn_refund_credits', {
        p_request_id: expect.any(String),
      });

      expect(insertMock).toHaveBeenCalled();
    });

    it('logs generation failure even if refund RPC fails', async () => {
      const userId = 'user-123';
      const walletId = 'wallet-123';

      (resolveWallet as jest.Mock).mockResolvedValue({
        id: walletId,
        balance: 100,
        owner_kind: 'user',
      });

      (deductCredits as jest.Mock).mockResolvedValue(90);

      mockAnthropic.messages.create.mockRejectedValue(new Error('AI error'));

      mockSupabase.rpc.mockRejectedValue(new Error('RPC error'));

      const insertMock = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: insertMock,
      });

      await expect(generateWithDeduction(userId, 'content.generate.short', 'Prompt')).rejects.toThrow();

      expect(insertMock).toHaveBeenCalled();
      expect(insertMock.mock.calls[0][0]).toMatchObject({
        status: 'failed',
        error: 'Error: AI error',
      });
    });
  });

  describe('Concurrent request handling', () => {
    it('does not cause double-deduction with concurrent requests', async () => {
      const userId = 'user-123';
      const walletId = 'wallet-123';
      const initialBalance = 100;
      const cost = 10;

      (resolveWallet as jest.Mock).mockResolvedValue({
        id: walletId,
        balance: initialBalance,
        owner_kind: 'user',
      });

      (deductCredits as jest.Mock)
        .mockResolvedValueOnce(90)
        .mockResolvedValueOnce(80);

      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Content' }],
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const promise1 = generateWithDeduction(userId, 'content.generate.short', 'Prompt 1');
      const promise2 = generateWithDeduction(userId, 'content.generate.short', 'Prompt 2');

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(deductCredits).toHaveBeenCalledTimes(2);
      expect(result1.credits_remaining).toBe(90);
      expect(result2.credits_remaining).toBe(80);
    });
  });

  describe('Negative balance handling after refund', () => {
    it('allows refund even if balance goes temporarily negative', async () => {
      const userId = 'user-123';
      const walletId = 'wallet-123';

      (resolveWallet as jest.Mock).mockResolvedValue({
        id: walletId,
        balance: 5, // Less than cost
        owner_kind: 'user',
      });

      (getCreditCost as jest.Mock).mockReturnValue(10);
      (deductCredits as jest.Mock).mockResolvedValue(-5);

      mockAnthropic.messages.create.mockRejectedValue(new Error('AI failed'));

      mockSupabase.rpc.mockResolvedValue({ error: null });

      const insertMock = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: insertMock,
      });

      await expect(generateWithDeduction(userId, 'content.generate.short', 'Prompt')).rejects.toThrow();

      expect(mockSupabase.rpc).toHaveBeenCalledWith('fn_refund_credits', {
        p_request_id: expect.any(String),
      });
    });
  });

  describe('Error messages clarity', () => {
    it('provides clear insufficient credits error message', async () => {
      (resolveWallet as jest.Mock).mockResolvedValue({
        id: 'wallet-123',
        balance: 0,
        owner_kind: 'user',
      });

      const error = await generateWithDeduction('user-123', 'content.generate.short', 'Prompt').catch(
        (e) => e
      );

      expect(error.message).toBe('Insufficient credits. Please top up to continue.');
      expect(error.status).toBe(402);
    });

    it('provides clear wallet not found error message', async () => {
      (resolveWallet as jest.Mock).mockResolvedValue(null);

      const error = await generateWithDeduction('user-123', 'content.generate.short', 'Prompt').catch(
        (e) => e
      );

      expect(error.message).toBe('Wallet not found.');
      expect(error.status).toBe(402);
    });

    it('preserves AI error message on generation failure', async () => {
      (resolveWallet as jest.Mock).mockResolvedValue({
        id: 'wallet-123',
        balance: 100,
        owner_kind: 'user',
      });

      (deductCredits as jest.Mock).mockResolvedValue(90);

      const aiError = new Error('Authentication failed with API key');
      mockAnthropic.messages.create.mockRejectedValue(aiError);

      mockSupabase.rpc.mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const error = await generateWithDeduction('user-123', 'content.generate.short', 'Prompt').catch(
        (e) => e
      );

      expect(error.message).toBe('Authentication failed with API key');
    });
  });

  describe('Non-text content handling', () => {
    it('returns empty string when response content is not text', async () => {
      const userId = 'user-123';
      const walletId = 'wallet-123';

      (resolveWallet as jest.Mock).mockResolvedValue({
        id: walletId,
        balance: 100,
        owner_kind: 'user',
      });

      (deductCredits as jest.Mock).mockResolvedValue(90);

      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'image', source: { url: 'https://example.com/image.jpg' } }],
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await generateWithDeduction(userId, 'content.generate.short', 'Prompt');

      expect(result.result).toBe('');
    });
  });

  describe('Request ID generation', () => {
    it('generates unique request IDs for each call', async () => {
      const userId = 'user-123';
      const walletId = 'wallet-123';

      (resolveWallet as jest.Mock).mockResolvedValue({
        id: walletId,
        balance: 100,
        owner_kind: 'user',
      });

      (deductCredits as jest.Mock).mockResolvedValue(90);

      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Content' }],
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const result1 = await generateWithDeduction(userId, 'content.generate.short', 'Prompt 1');
      const result2 = await generateWithDeduction(userId, 'content.generate.short', 'Prompt 2');

      expect(result1.request_id).toBeDefined();
      expect(result2.request_id).toBeDefined();
      expect(result1.request_id).not.toBe(result2.request_id);
    });

    it('uses same request ID for refund when generation fails', async () => {
      const userId = 'user-123';
      const walletId = 'wallet-123';

      (resolveWallet as jest.Mock).mockResolvedValue({
        id: walletId,
        balance: 100,
        owner_kind: 'user',
      });

      (deductCredits as jest.Mock).mockResolvedValue(90);

      mockAnthropic.messages.create.mockRejectedValue(new Error('AI error'));

      mockSupabase.rpc.mockResolvedValue({ error: null });

      const insertMock = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: insertMock,
      });

      await expect(generateWithDeduction(userId, 'content.generate.short', 'Prompt')).rejects.toThrow();

      const rpcCall = mockSupabase.rpc.mock.calls[0];
      const logCall = insertMock.mock.calls[0];

      expect(rpcCall[1].p_request_id).toBe(logCall[0].request_id);
    });
  });

  describe('Logging error handling', () => {
    it('continues despite generation_log insert failure on success', async () => {
      const userId = 'user-123';
      const walletId = 'wallet-123';

      (resolveWallet as jest.Mock).mockResolvedValue({
        id: walletId,
        balance: 100,
        owner_kind: 'user',
      });

      (deductCredits as jest.Mock).mockResolvedValue(90);

      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Content' }],
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      const result = await generateWithDeduction(userId, 'content.generate.short', 'Prompt');

      expect(result.result).toBe('Content');
      expect(result.credits_remaining).toBe(90);
    });

    it('continues despite generation_log insert failure on failure', async () => {
      const userId = 'user-123';
      const walletId = 'wallet-123';

      (resolveWallet as jest.Mock).mockResolvedValue({
        id: walletId,
        balance: 100,
        owner_kind: 'user',
      });

      (deductCredits as jest.Mock).mockResolvedValue(90);

      mockAnthropic.messages.create.mockRejectedValue(new Error('AI error'));

      mockSupabase.rpc.mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockRejectedValue(new Error('Log insert error')),
      });

      await expect(generateWithDeduction(userId, 'content.generate.short', 'Prompt')).rejects.toThrow('AI error');
    });
  });
});
