/**
 * Default Template Tests
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_SHOW_TEMPLATE } from './default-template.js';

describe('DEFAULT_SHOW_TEMPLATE', () => {
    it('should be registered under the id "default"', () => {
        expect(DEFAULT_SHOW_TEMPLATE.id).toBe('default');
        expect(DEFAULT_SHOW_TEMPLATE.segments.length).toBeGreaterThan(0);
    });

    it('should have segments without scene names so it works out of the box', () => {
        for (const segment of DEFAULT_SHOW_TEMPLATE.segments) {
            expect(segment.defaultSceneName).toBeUndefined();
        }
    });

    it('should contain an ending segment for end_show play_ending', () => {
        expect(
            DEFAULT_SHOW_TEMPLATE.segments.some((s) => s.type === 'ending')
        ).toBe(true);
    });
});
