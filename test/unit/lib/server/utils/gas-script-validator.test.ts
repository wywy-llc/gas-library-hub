import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GasScriptValidator } from '$lib/server/utils/gas-script-validator';

describe('GasScriptValidator', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('mapHttpStatus', () => {
    it('200は"accessible"を返す', () => {
      expect(GasScriptValidator.mapHttpStatus(200)).toBe('accessible');
    });

    it('401は"inaccessible"を返す', () => {
      expect(GasScriptValidator.mapHttpStatus(401)).toBe('inaccessible');
    });

    it('403は"inaccessible"を返す', () => {
      expect(GasScriptValidator.mapHttpStatus(403)).toBe('inaccessible');
    });

    it('404は"not_found"を返す', () => {
      expect(GasScriptValidator.mapHttpStatus(404)).toBe('not_found');
    });

    it('500は"unknown"を返す', () => {
      expect(GasScriptValidator.mapHttpStatus(500)).toBe('unknown');
    });
  });

  describe('hasIssue', () => {
    it('"inaccessible"は問題ありと判定', () => {
      expect(GasScriptValidator.hasIssue('inaccessible')).toBe(true);
    });

    it('"not_found"は問題ありと判定', () => {
      expect(GasScriptValidator.hasIssue('not_found')).toBe(true);
    });

    it('"accessible"は問題なしと判定', () => {
      expect(GasScriptValidator.hasIssue('accessible')).toBe(false);
    });

    it('"unknown"は問題なしと判定', () => {
      expect(GasScriptValidator.hasIssue('unknown')).toBe(false);
    });
  });

  describe('validate', () => {
    it('200レスポンスの場合はaccessibleを返す', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await GasScriptValidator.validate('1ValidScriptId');

      expect(result.scriptId).toBe('1ValidScriptId');
      expect(result.status).toBe('accessible');
      expect(result.httpStatus).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://drive.google.com/file/d/1ValidScriptId/view',
        expect.objectContaining({
          method: 'HEAD',
          redirect: 'manual',
        })
      );
    });

    it('401レスポンスの場合はinaccessibleを返す', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 401,
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await GasScriptValidator.validate('1PrivateScriptId');

      expect(result.status).toBe('inaccessible');
      expect(result.httpStatus).toBe(401);
    });

    it('404レスポンスの場合はnot_foundを返す', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 404,
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await GasScriptValidator.validate('1DeletedScriptId');

      expect(result.status).toBe('not_found');
      expect(result.httpStatus).toBe(404);
    });

    it('ネットワークエラーの場合はunknownを返す', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', mockFetch);

      const result = await GasScriptValidator.validate('1NetworkErrorScriptId');

      expect(result.status).toBe('unknown');
      expect(result.httpStatus).toBe(0);
    });
  });

  describe('validateMultiple', () => {
    it('複数のスクリプトIDを並列で検証する', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({ status: 200 })
        .mockResolvedValueOnce({ status: 401 })
        .mockResolvedValueOnce({ status: 404 });
      vi.stubGlobal('fetch', mockFetch);

      const results = await GasScriptValidator.validateMultiple([
        '1AccessibleId',
        '1PrivateId',
        '1DeletedId',
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('accessible');
      expect(results[1].status).toBe('inaccessible');
      expect(results[2].status).toBe('not_found');
    });
  });
});
