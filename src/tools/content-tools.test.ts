/**
 * Content Tools Tests - TDD
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentTools } from './content-tools.js';
import { OBSAdapter } from '../adapters/obs-adapter.js';
import { SafetyGuard } from '../safety/safety-guard.js';

// Mock OBS Adapter
vi.mock('../adapters/obs-adapter.js', () => {
    return {
        OBSAdapter: vi.fn().mockImplementation(() => ({
            setInputSettings: vi.fn().mockResolvedValue(undefined),
            isConnected: vi.fn().mockReturnValue(true),
        })),
    };
});

describe('ContentTools', () => {
    let contentTools: ContentTools;
    let obsAdapter: OBSAdapter;
    let safetyGuard: SafetyGuard;

    beforeEach(() => {
        obsAdapter = new OBSAdapter();
        safetyGuard = new SafetyGuard();
        contentTools = new ContentTools(obsAdapter, safetyGuard);
    });

    describe('updateSourceContent', () => {
        it('should update text source content', async () => {
            const result = await contentTools.updateSourceContent({
                sourceName: 'TopicText',
                content: 'Current Topic: AI in Gaming',
            });

            expect(result.success).toBe(true);
            expect(obsAdapter.setInputSettings).toHaveBeenCalledWith(
                'TopicText',
                { text: 'Current Topic: AI in Gaming' },
                true
            );
        });

        it('should update browser source URL', async () => {
            const result = await contentTools.updateSourceContent({
                sourceName: 'BrowserWidget',
                content: 'https://example.com/widget',
                sourceType: 'browser',
            });

            expect(result.success).toBe(true);
            expect(obsAdapter.setInputSettings).toHaveBeenCalledWith(
                'BrowserWidget',
                { url: 'https://example.com/widget' },
                true
            );
        });

        it('should update image source file', async () => {
            const result = await contentTools.updateSourceContent({
                sourceName: 'LogoImage',
                content: '/path/to/logo.png',
                sourceType: 'image',
            });

            expect(result.success).toBe(true);
            expect(obsAdapter.setInputSettings).toHaveBeenCalledWith(
                'LogoImage',
                { file: '/path/to/logo.png' },
                true
            );
        });

        it('should apply additional properties', async () => {
            const result = await contentTools.updateSourceContent({
                sourceName: 'SubtitleText',
                content: 'Breaking News!',
                properties: { font: { size: 48 } },
            });

            expect(result.success).toBe(true);
            expect(obsAdapter.setInputSettings).toHaveBeenCalledWith(
                'SubtitleText',
                { text: 'Breaking News!', font: { size: 48 } },
                true
            );
        });
    });
});
