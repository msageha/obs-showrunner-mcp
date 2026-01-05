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
        it('should take screenshot of program output', async () => {
            const result = await visionTools.takeStreamSnapshot({});

            expect(result.success).toBe(true);
            expect(result.data?.imageData).toContain('data:image/png');
        });

        it('should take screenshot of specific source', async () => {
            await visionTools.takeStreamSnapshot({
                sourceName: 'Game Capture',
            });

            expect(obsAdapter.getSourceScreenshot).toHaveBeenCalledWith(
                'Game Capture',
                'png'
            );
        });

        it('should support different image formats', async () => {
            await visionTools.takeStreamSnapshot({
                sourceName: 'Webcam',
                imageFormat: 'jpg',
            });

            expect(obsAdapter.getSourceScreenshot).toHaveBeenCalledWith('Webcam', 'jpg');
        });
    });
});
