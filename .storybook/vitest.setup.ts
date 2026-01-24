import { setProjectAnnotations } from '@storybook/svelte';
import '@testing-library/jest-dom/vitest';
import { beforeAll } from 'vitest';

import * as previewAnnotations from './preview';

const annotations = setProjectAnnotations([previewAnnotations]);

// Run beforeAll hook to set up project annotations
beforeAll(annotations.beforeAll);
