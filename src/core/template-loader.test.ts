/**
 * Template Loader Tests
 */

import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    DEFAULT_SHOW_TEMPLATE,
    loadTemplatesFromFile,
} from './template-loader.js';

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

describe('loadTemplatesFromFile', () => {
    let dir: string;

    beforeEach(() => {
        dir = mkdtempSync(path.join(tmpdir(), 'obs-showrunner-test-'));
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    const write = (content: string): string => {
        const filePath = path.join(dir, 'templates.json');
        writeFileSync(filePath, content);
        return filePath;
    };

    it('should load a single template object', () => {
        const filePath = write(
            JSON.stringify({
                id: 'my-show',
                name: 'My Show',
                segments: [{ id: 'main', name: 'Main', type: 'talk' }],
            })
        );

        const templates = loadTemplatesFromFile(filePath);

        expect(templates).toHaveLength(1);
        expect(templates[0].id).toBe('my-show');
    });

    it('should load an array of templates', () => {
        const filePath = write(
            JSON.stringify([
                {
                    id: 'show-a',
                    name: 'Show A',
                    segments: [
                        {
                            id: 'main',
                            name: 'Main',
                            type: 'talk',
                            defaultSceneName: 'Main Scene',
                            timerSec: 600,
                        },
                    ],
                },
                {
                    id: 'show-b',
                    name: 'Show B',
                    segments: [{ id: 'main', name: 'Main', type: 'game' }],
                },
            ])
        );

        const templates = loadTemplatesFromFile(filePath);

        expect(templates).toHaveLength(2);
        expect(templates[1].id).toBe('show-b');
    });

    it('should throw for a missing file', () => {
        expect(() =>
            loadTemplatesFromFile(path.join(dir, 'nope.json'))
        ).toThrow(/Failed to read/);
    });

    it('should throw for invalid JSON', () => {
        const filePath = write('{ not json');
        expect(() => loadTemplatesFromFile(filePath)).toThrow(/Invalid JSON/);
    });

    it('should throw with a descriptive message for schema violations', () => {
        const filePath = write(
            JSON.stringify({ id: 'bad', name: 'Bad Show', segments: [] })
        );
        expect(() => loadTemplatesFromFile(filePath)).toThrow(/segments/);
    });
});
