import { describe, it, expect } from 'vitest';
import {
  GoogleDocUrlTransformService,
  GoogleDocUrlTransformError,
} from '../../../../../src/lib/server/services/google-doc-url-transform-service.js';

describe('GoogleDocUrlTransformService', () => {
  describe('transform', () => {
    describe('スプレッドシート', () => {
      it('/edit URLを/copyに変換する', () => {
        const result = GoogleDocUrlTransformService.transform(
          'https://docs.google.com/spreadsheets/d/1abc123xyz/edit'
        );

        expect(result.documentType).toBe('spreadsheet');
        expect(result.documentId).toBe('1abc123xyz');
        expect(result.originalUrl).toBe('https://docs.google.com/spreadsheets/d/1abc123xyz/edit');
        expect(result.copyUrl).toBe('https://docs.google.com/spreadsheets/d/1abc123xyz/copy');
      });

      it('フラグメント付きURLを処理できる', () => {
        const result = GoogleDocUrlTransformService.transform(
          'https://docs.google.com/spreadsheets/d/1abc123xyz/edit#gid=0'
        );

        expect(result.documentType).toBe('spreadsheet');
        expect(result.copyUrl).toBe('https://docs.google.com/spreadsheets/d/1abc123xyz/copy');
      });

      it('クエリパラメータ付きURLを処理できる', () => {
        const result = GoogleDocUrlTransformService.transform(
          'https://docs.google.com/spreadsheets/d/1abc123xyz/edit?usp=sharing'
        );

        expect(result.documentType).toBe('spreadsheet');
        expect(result.copyUrl).toBe('https://docs.google.com/spreadsheets/d/1abc123xyz/copy');
      });
    });

    describe('ドキュメント', () => {
      it('/edit URLを/copyに変換する', () => {
        const result = GoogleDocUrlTransformService.transform(
          'https://docs.google.com/document/d/1doc456def/edit'
        );

        expect(result.documentType).toBe('document');
        expect(result.documentId).toBe('1doc456def');
        expect(result.originalUrl).toBe('https://docs.google.com/document/d/1doc456def/edit');
        expect(result.copyUrl).toBe('https://docs.google.com/document/d/1doc456def/copy');
      });
    });

    describe('スライド', () => {
      it('/edit URLを/copyに変換する', () => {
        const result = GoogleDocUrlTransformService.transform(
          'https://docs.google.com/presentation/d/1slides789ghi/edit'
        );

        expect(result.documentType).toBe('slides');
        expect(result.documentId).toBe('1slides789ghi');
        expect(result.originalUrl).toBe(
          'https://docs.google.com/presentation/d/1slides789ghi/edit'
        );
        expect(result.copyUrl).toBe('https://docs.google.com/presentation/d/1slides789ghi/copy');
      });
    });

    describe('Apps Script', () => {
      it('/d/形式のURLを?copyDoc=trueに変換する', () => {
        const result = GoogleDocUrlTransformService.transform(
          'https://script.google.com/d/1gasScriptId/edit'
        );

        expect(result.documentType).toBe('apps_script');
        expect(result.documentId).toBe('1gasScriptId');
        expect(result.originalUrl).toBe('https://script.google.com/d/1gasScriptId/edit');
        expect(result.copyUrl).toBe('https://script.google.com/d/1gasScriptId/edit?copyDoc=true');
      });

      it('/home/projects/形式のURLを処理できる', () => {
        const result = GoogleDocUrlTransformService.transform(
          'https://script.google.com/home/projects/1gasScriptId/edit'
        );

        expect(result.documentType).toBe('apps_script');
        expect(result.documentId).toBe('1gasScriptId');
      });
    });

    describe('エラーケース', () => {
      it('空文字列でINVALID_URLエラーをスローする', () => {
        expect(() => GoogleDocUrlTransformService.transform('')).toThrow(
          GoogleDocUrlTransformError
        );
        expect(() => GoogleDocUrlTransformService.transform('')).toThrow('URLが指定されていません');
      });

      it('nullでINVALID_URLエラーをスローする', () => {
        expect(() => GoogleDocUrlTransformService.transform(null as unknown as string)).toThrow(
          GoogleDocUrlTransformError
        );
      });

      it('Google以外のURLでINVALID_URLエラーをスローする', () => {
        expect(() =>
          GoogleDocUrlTransformService.transform('https://example.com/document')
        ).toThrow(GoogleDocUrlTransformError);
        expect(() =>
          GoogleDocUrlTransformService.transform('https://example.com/document')
        ).toThrow('GoogleドキュメントのURLを入力してください');
      });

      it('Googleフォームで具体的なエラーメッセージをスローする', () => {
        expect(() =>
          GoogleDocUrlTransformService.transform('https://docs.google.com/forms/d/123/edit')
        ).toThrow(GoogleDocUrlTransformError);
        expect(() =>
          GoogleDocUrlTransformService.transform('https://docs.google.com/forms/d/123/edit')
        ).toThrow('Googleフォームはサポートされていません');
      });

      it('Google図形描画で具体的なエラーメッセージをスローする', () => {
        expect(() =>
          GoogleDocUrlTransformService.transform('https://docs.google.com/drawings/d/123/edit')
        ).toThrow(GoogleDocUrlTransformError);
        expect(() =>
          GoogleDocUrlTransformService.transform('https://docs.google.com/drawings/d/123/edit')
        ).toThrow('Google図形描画はサポートされていません');
      });

      it('不明なGoogleドキュメント形式でUNSUPPORTED_TYPEエラーをスローする', () => {
        expect(() =>
          GoogleDocUrlTransformService.transform('https://docs.google.com/unknown/d/123/edit')
        ).toThrow(GoogleDocUrlTransformError);
        expect(() =>
          GoogleDocUrlTransformService.transform('https://docs.google.com/unknown/d/123/edit')
        ).toThrow('サポートされていないURL形式です');
      });
    });
  });

  describe('isSupported', () => {
    it('サポートされているURLでtrueを返す', () => {
      expect(
        GoogleDocUrlTransformService.isSupported('https://docs.google.com/spreadsheets/d/123/edit')
      ).toBe(true);
      expect(
        GoogleDocUrlTransformService.isSupported('https://docs.google.com/document/d/123/edit')
      ).toBe(true);
      expect(
        GoogleDocUrlTransformService.isSupported('https://docs.google.com/presentation/d/123/edit')
      ).toBe(true);
      expect(GoogleDocUrlTransformService.isSupported('https://script.google.com/d/123/edit')).toBe(
        true
      );
    });

    it('サポートされていないURLでfalseを返す', () => {
      expect(GoogleDocUrlTransformService.isSupported('https://example.com')).toBe(false);
      expect(
        GoogleDocUrlTransformService.isSupported('https://docs.google.com/forms/d/123/edit')
      ).toBe(false);
    });

    it('空文字列やnullでfalseを返す', () => {
      expect(GoogleDocUrlTransformService.isSupported('')).toBe(false);
      expect(GoogleDocUrlTransformService.isSupported(null as unknown as string)).toBe(false);
    });
  });

  describe('getDocumentType', () => {
    it('正しいドキュメントタイプを返す', () => {
      expect(
        GoogleDocUrlTransformService.getDocumentType(
          'https://docs.google.com/spreadsheets/d/123/edit'
        )
      ).toBe('spreadsheet');
      expect(
        GoogleDocUrlTransformService.getDocumentType('https://docs.google.com/document/d/123/edit')
      ).toBe('document');
      expect(
        GoogleDocUrlTransformService.getDocumentType(
          'https://docs.google.com/presentation/d/123/edit'
        )
      ).toBe('slides');
      expect(
        GoogleDocUrlTransformService.getDocumentType('https://script.google.com/d/123/edit')
      ).toBe('apps_script');
    });

    it('サポートされていないURLでnullを返す', () => {
      expect(GoogleDocUrlTransformService.getDocumentType('https://example.com')).toBe(null);
      expect(
        GoogleDocUrlTransformService.getDocumentType('https://docs.google.com/forms/d/123/edit')
      ).toBe(null);
    });

    it('空文字列やnullでnullを返す', () => {
      expect(GoogleDocUrlTransformService.getDocumentType('')).toBe(null);
      expect(GoogleDocUrlTransformService.getDocumentType(null as unknown as string)).toBe(null);
    });
  });
});
