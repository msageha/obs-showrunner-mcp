/**
 * Vision Tools Tests - TDD
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VisionTools } from './vision-tools.js';
import { OBSAdapter } from '../adapters/obs-adapter.js';
import { SafetyGuard } from '../safety/safety-guard.js';

// Mock OBS Adapter
vi.mock('../adapters/obs-adapter.js', () => {
    return {
        OBSAdapter: vi.fn().mockImplementation(() => ({
            getSourceScreenshot: vi.fn().mockResolvedValue('data:image/png;base64,iVBORw0KGgo...'),
            getSceneList: vi.fn().mockResolvedValue({
                currentProgramSceneName: 'Program Scene',
                currentProgramSceneUuid: 'uuid-program',
                scenes: [],
            }),
            isConnected: vi.fn().mockReturnValue(true),
        })),
    };
});

describe('VisionTools', () => {
    let visionTools: VisionTools;
    let obsAdapter: OBSAdapter;
    let safetyGuard: SafetyGuard;

    beforeEach(() => {
        obsAdapter = new OBSAdapter();
        safetyGuard = new SafetyGuard();
        visionTools = new VisionTools(obsAdapter, safetyGuard);
    });

    describe('takeStreamSnapshot', () => {
        it('should capture the current program scene when no source given', async () => {
            const result = await visionTools.takeStreamSnapshot({});

            expect(result.success).toBe(true);
            expect(result.data?.imageData).toContain('data:image/png');
            expect(obsAdapter.getSourceScreenshot).toHaveBeenCalledWith(
                'Program Scene',
                {
                    imageFormat: 'jpg',
                    imageWidth: 1280,
                    imageCompressionQuality: 75,
                }
            );
        });

        it('should error when no source and no active program scene', async () => {
            (obsAdapter.getSceneList as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                currentProgramSceneName: null,
                scenes: [],
            });

            const result = await visionTools.takeStreamSnapshot({});

            expect(result.success).toBe(false);
            expect(obsAdapter.getSourceScreenshot).not.toHaveBeenCalled();
        });

        it('should take screenshot of specific source', async () => {
            await visionTools.takeStreamSnapshot({
                sourceName: 'Game Capture',
            });

            expect(obsAdapter.getSourceScreenshot).toHaveBeenCalledWith(
                'Game Capture',
                {
                    imageFormat: 'jpg',
                    imageWidth: 1280,
                    imageCompressionQuality: 75,
                }
            );
        });

        it('should support overriding format and width', async () => {
            await visionTools.takeStreamSnapshot({
                sourceName: 'Webcam',
                imageFormat: 'png',
                imageWidth: 640,
            });

            expect(obsAdapter.getSourceScreenshot).toHaveBeenCalledWith('Webcam', {
                imageFormat: 'png',
                imageWidth: 640,
                imageCompressionQuality: 75,
            });
        });
    });
});
