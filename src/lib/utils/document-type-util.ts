/**
 * DocumentType関連のユーティリティ関数
 * ラベルとアイコンの取得をコンポーネント間で共有
 */

import type { DocumentType } from '$lib/server/db/schema.js';
import {
  sample_document_type_apps_script,
  sample_document_type_document,
  sample_document_type_slides,
  sample_document_type_spreadsheet,
} from '$lib/paraglide/messages.js';

/**
 * DocumentTypeに対応するローカライズされたラベルを取得
 */
export function getDocumentTypeLabel(type: DocumentType): string {
  switch (type) {
    case 'spreadsheet':
      return sample_document_type_spreadsheet();
    case 'document':
      return sample_document_type_document();
    case 'slides':
      return sample_document_type_slides();
    case 'apps_script':
      return sample_document_type_apps_script();
  }
}

/**
 * DocumentTypeに対応するアイコン絵文字を取得
 */
export function getDocumentTypeIcon(type: DocumentType): string {
  switch (type) {
    case 'spreadsheet':
      return '📊';
    case 'document':
      return '📄';
    case 'slides':
      return '📽️';
    case 'apps_script':
      return '⚡';
  }
}
