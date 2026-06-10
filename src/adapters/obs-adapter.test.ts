/**
 * OBS Adapter Tests - TDD
 * Tests written first, then implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OBSAdapter } from './obs-adapter.js';

// Mock obs-websocket-js
vi.mock('obs-websocket-js', () => {
    const mockOBS = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        call: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    };
    return {
        default: vi.fn(() => mockOBS),
    };
});

type MockOBS = Record<
    'connect' | 'disconnect' | 'call' | 'on' | 'off',
    ReturnType<typeof vi.fn>
>;

describe('OBSAdapter', () => {
    let adapter: OBSAdapter;
    let mockOBS: MockOBS;

    beforeEach(async () => {
        // Get fresh mock
        const OBSWebSocket = (await import('obs-websocket-js')).default;
        mockOBS = new OBSWebSocket() as unknown as MockOBS;
        adapter = new OBSAdapter();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('connect', () => {
        it('should connect to OBS WebSocket with URL and password', async () => {
            mockOBS.connect.mockResolvedValueOnce(undefined);

            await adapter.connect('ws://localhost:4455', 'testpassword');

            expect(mockOBS.connect).toHaveBeenCalledWith(
                'ws://localhost:4455',
                'testpassword',
                expect.any(Object)
            );
            expect(adapter.isConnected()).toBe(true);
        });

        it('should connect without password', async () => {
            mockOBS.connect.mockResolvedValueOnce(undefined);

            await adapter.connect('ws://localhost:4455');

            expect(mockOBS.connect).toHaveBeenCalledWith(
                'ws://localhost:4455',
                undefined,
                expect.any(Object)
            );
        });

        it('should throw error on connection failure', async () => {
            mockOBS.connect.mockRejectedValueOnce(new Error('Connection refused'));

            await expect(
                adapter.connect('ws://localhost:4455')
            ).rejects.toThrow('Connection refused');
            expect(adapter.isConnected()).toBe(false);
        });
    });

    describe('disconnect', () => {
        it('should disconnect from OBS WebSocket', async () => {
            mockOBS.connect.mockResolvedValueOnce(undefined);
            mockOBS.disconnect.mockResolvedValueOnce(undefined);

            await adapter.connect('ws://localhost:4455');
            await adapter.disconnect();

            expect(mockOBS.disconnect).toHaveBeenCalled();
            expect(adapter.isConnected()).toBe(false);
        });
    });

    describe('getSceneList', () => {
        it('should return list of scenes', async () => {
            mockOBS.connect.mockResolvedValueOnce(undefined);
            mockOBS.call.mockResolvedValueOnce({
                currentProgramSceneName: 'Scene 1',
                currentProgramSceneUuid: 'uuid-1',
                scenes: [
                    { sceneName: 'Scene 1', sceneUuid: 'uuid-1', sceneIndex: 0 },
                    { sceneName: 'Scene 2', sceneUuid: 'uuid-2', sceneIndex: 1 },
                ],
            });

            await adapter.connect('ws://localhost:4455');
            const result = await adapter.getSceneList();

            expect(mockOBS.call).toHaveBeenCalledWith('GetSceneList');
            expect(result.currentProgramSceneName).toBe('Scene 1');
            expect(result.scenes).toHaveLength(2);
        });

        it('should throw error when not connected', async () => {
            await expect(adapter.getSceneList()).rejects.toThrow('Not connected');
        });
    });

    describe('setCurrentScene', () => {
        it('should set current program scene by name', async () => {
            mockOBS.connect.mockResolvedValueOnce(undefined);
            mockOBS.call.mockResolvedValueOnce(undefined);

            await adapter.connect('ws://localhost:4455');
            await adapter.setCurrentScene('Scene 2');

            expect(mockOBS.call).toHaveBeenCalledWith('SetCurrentProgramScene', {
                sceneName: 'Scene 2',
            });
        });

        it('should throw error when not connected', async () => {
            await expect(adapter.setCurrentScene('Scene 1')).rejects.toThrow(
                'Not connected'
            );
        });
    });

    describe('getSourceScreenshot', () => {
        it('should default to jpg format', async () => {
            const base64Image = 'data:image/jpg;base64,/9j/4AAQSkZJRg...';
            mockOBS.connect.mockResolvedValueOnce(undefined);
            mockOBS.call.mockResolvedValueOnce({
                imageData: base64Image,
            });

            await adapter.connect('ws://localhost:4455');
            const result = await adapter.getSourceScreenshot('Program');

            expect(mockOBS.call).toHaveBeenCalledWith('GetSourceScreenshot', {
                sourceName: 'Program',
                imageFormat: 'jpg',
            });
            expect(result).toBe(base64Image);
        });

        it('should pass format, width and compression quality', async () => {
            const base64Image = 'data:image/png;base64,iVBORw0KGgo...';
            mockOBS.connect.mockResolvedValueOnce(undefined);
            mockOBS.call.mockResolvedValueOnce({
                imageData: base64Image,
            });

            await adapter.connect('ws://localhost:4455');
            const result = await adapter.getSourceScreenshot('Game Capture', {
                imageFormat: 'png',
                imageWidth: 1280,
                imageCompressionQuality: 75,
            });

            expect(mockOBS.call).toHaveBeenCalledWith('GetSourceScreenshot', {
                sourceName: 'Game Capture',
                imageFormat: 'png',
                imageWidth: 1280,
                imageCompressionQuality: 75,
            });
            expect(result).toBe(base64Image);
        });
    });

    describe('applySmoothTransition', () => {
        it('should find the fade transition by kind and set duration', async () => {
            mockOBS.connect.mockResolvedValueOnce(undefined);
            mockOBS.call
                .mockResolvedValueOnce({
                    transitions: [
                        { transitionName: 'カット', transitionKind: 'cut_transition' },
                        { transitionName: 'フェード', transitionKind: 'fade_transition' },
                    ],
                })
                .mockResolvedValueOnce(undefined)
                .mockResolvedValueOnce(undefined);

            await adapter.connect('ws://localhost:4455');
            const applied = await adapter.applySmoothTransition(500);

            expect(applied).toBe(true);
            expect(mockOBS.call).toHaveBeenCalledWith('SetCurrentSceneTransition', {
                transitionName: 'フェード',
            });
            expect(mockOBS.call).toHaveBeenCalledWith(
                'SetCurrentSceneTransitionDuration',
                { transitionDuration: 500 }
            );
        });

        it('should return false when no fade transition exists', async () => {
            mockOBS.connect.mockResolvedValueOnce(undefined);
            mockOBS.call.mockResolvedValueOnce({
                transitions: [
                    { transitionName: 'Cut', transitionKind: 'cut_transition' },
                ],
            });

            await adapter.connect('ws://localhost:4455');
            const applied = await adapter.applySmoothTransition(500);

            expect(applied).toBe(false);
            expect(mockOBS.call).not.toHaveBeenCalledWith(
                'SetCurrentSceneTransition',
                expect.anything()
            );
        });
    });

    describe('setInputSettings', () => {
        it('should update input settings', async () => {
            mockOBS.connect.mockResolvedValueOnce(undefined);
            mockOBS.call.mockResolvedValueOnce(undefined);

            await adapter.connect('ws://localhost:4455');
            await adapter.setInputSettings('TextSource', { text: 'Hello World' });

            expect(mockOBS.call).toHaveBeenCalledWith('SetInputSettings', {
                inputName: 'TextSource',
                inputSettings: { text: 'Hello World' },
                overlay: true,
            });
        });
    });

    describe('setInputVolume', () => {
        it('should set input volume (multiplier)', async () => {
            mockOBS.connect.mockResolvedValueOnce(undefined);
            mockOBS.call.mockResolvedValueOnce(undefined);

            await adapter.connect('ws://localhost:4455');
            await adapter.setInputVolume('Mic/Aux', 0.8);

            expect(mockOBS.call).toHaveBeenCalledWith('SetInputVolume', {
                inputName: 'Mic/Aux',
                inputVolumeMul: 0.8,
            });
        });
    });

    describe('setInputMute', () => {
        it('should mute input', async () => {
            mockOBS.connect.mockResolvedValueOnce(undefined);
            mockOBS.call.mockResolvedValueOnce(undefined);

            await adapter.connect('ws://localhost:4455');
            await adapter.setInputMute('Mic/Aux', true);

            expect(mockOBS.call).toHaveBeenCalledWith('SetInputMute', {
                inputName: 'Mic/Aux',
                inputMuted: true,
            });
        });
    });

    describe('getStats', () => {
        it('should return OBS stats', async () => {
            mockOBS.connect.mockResolvedValueOnce(undefined);
            mockOBS.call.mockResolvedValueOnce({
                cpuUsage: 5.5,
                memoryUsage: 1024,
                activeFps: 60,
                renderSkippedFrames: 0,
                renderTotalFrames: 10000,
                outputSkippedFrames: 2,
                outputTotalFrames: 10000,
            });

            await adapter.connect('ws://localhost:4455');
            const stats = await adapter.getStats();

            expect(mockOBS.call).toHaveBeenCalledWith('GetStats');
            expect(stats.cpuUsage).toBe(5.5);
            expect(stats.activeFps).toBe(60);
        });
    });

    describe('getVersion', () => {
        it('should return OBS version info', async () => {
            mockOBS.connect.mockResolvedValueOnce(undefined);
            mockOBS.call.mockResolvedValueOnce({
                obsVersion: '31.0.0',
                obsWebSocketVersion: '5.5.0',
                rpcVersion: 1,
                platform: 'macos',
            });

            await adapter.connect('ws://localhost:4455');
            const version = await adapter.getVersion();

            expect(mockOBS.call).toHaveBeenCalledWith('GetVersion');
            expect(version.obsVersion).toBe('31.0.0');
        });
    });

    describe('setSceneItemEnabled', () => {
        it('should enable/disable scene item', async () => {
            mockOBS.connect.mockResolvedValueOnce(undefined);
            mockOBS.call.mockResolvedValueOnce({ sceneItemId: 123 });
            mockOBS.call.mockResolvedValueOnce(undefined);

            await adapter.connect('ws://localhost:4455');
            await adapter.setSceneItemEnabled('Main Scene', 'Overlay', true);

            expect(mockOBS.call).toHaveBeenCalledWith('GetSceneItemId', {
                sceneName: 'Main Scene',
                sourceName: 'Overlay',
            });
            expect(mockOBS.call).toHaveBeenCalledWith('SetSceneItemEnabled', {
                sceneName: 'Main Scene',
                sceneItemId: 123,
                sceneItemEnabled: true,
            });
        });
    });

    describe('stopStream', () => {
        it('should stop the active stream', async () => {
            mockOBS.connect.mockResolvedValueOnce(undefined);
            mockOBS.call.mockResolvedValueOnce(undefined);

            await adapter.connect('ws://localhost:4455');
            await adapter.stopStream();

            expect(mockOBS.call).toHaveBeenCalledWith('StopStream');
        });

        it('should throw error when not connected', async () => {
            await expect(adapter.stopStream()).rejects.toThrow('Not connected');
        });
    });

    describe('stopRecord', () => {
        it('should stop the active recording', async () => {
            mockOBS.connect.mockResolvedValueOnce(undefined);
            mockOBS.call.mockResolvedValueOnce(undefined);

            await adapter.connect('ws://localhost:4455');
            await adapter.stopRecord();

            expect(mockOBS.call).toHaveBeenCalledWith('StopRecord');
        });

        it('should throw error when not connected', async () => {
            await expect(adapter.stopRecord()).rejects.toThrow('Not connected');
        });
    });

    describe('connection state', () => {
        it('should mark disconnected when OBS connection closes', async () => {
            mockOBS.connect.mockResolvedValueOnce(undefined);
            await adapter.connect('ws://localhost:4455');
            expect(adapter.isConnected()).toBe(true);

            const closedHandler = mockOBS.on.mock.calls.find(
                (call: unknown[]) => call[0] === 'ConnectionClosed'
            )?.[1] as (() => void) | undefined;
            expect(closedHandler).toBeDefined();
            closedHandler?.();

            expect(adapter.isConnected()).toBe(false);
        });
    });
});
