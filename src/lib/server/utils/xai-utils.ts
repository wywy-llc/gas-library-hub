import { env } from '$env/dynamic/private';
import OpenAI from 'openai';

/**
 * xAI Grok APIクライアントのユーティリティ
 * OpenAI SDK互換のインターフェースで動作
 */
export class XaiUtils {
  private static client: OpenAI | null = null;

  /**
   * xAI APIクライアントを取得
   * @returns xAI APIクライアント（OpenAI SDK互換）
   */
  static getClient(): OpenAI {
    if (!XaiUtils.client) {
      if (!env.XAI_API_KEY) {
        throw new Error('XAI_API_KEY environment variable is required');
      }
      XaiUtils.client = new OpenAI({
        apiKey: env.XAI_API_KEY,
        baseURL: 'https://api.x.ai/v1',
        timeout: 360000, // 推論モデル用に長めのタイムアウト設定
      });
    }
    return XaiUtils.client;
  }

  /**
   * リクエストヘッダーを作成
   * @returns リクエストヘッダー
   */
  static createHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.XAI_API_KEY}`,
    };
  }
}
