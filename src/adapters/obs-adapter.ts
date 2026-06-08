/**
 * OBS Adapter - Wrapper for obs-websocket-js
 * Provides a clean interface for OBS WebSocket operations
 */

import OBSWebSocket from 'obs-websocket-js';

export interface SceneListResponse {
    currentProgramSceneName: string | null;
    currentProgramSceneUuid: string | null;
    currentPreviewSceneName: string | null;
    currentPreviewSceneUuid: string | null;
    scenes: Array<{
        sceneName: string;
        sceneUuid: string;
        sceneIndex: number;
    }>;
}

export interface OBSStats {
    cpuUsage: number;
    memoryUsage: number;
    activeFps: number;
    renderSkippedFrames: number;
    renderTotalFrames: number;
    outputSkippedFrames: number;
    outputTotalFrames: number;
}

export interface OBSVersion {
    obsVersion: string;
    obsWebSocketVersion: string;
    rpcVersion: number;
    platform: string;
}

export class OBSAdapter {
    private obs: OBSWebSocket;
    private connected: boolean = false;

    constructor() {
        this.obs = new OBSWebSocket();

        // Keep the connected flag in sync when OBS drops the socket, so
        // isConnected() stays accurate, tools fail fast with a clear error,
        // and reconnect_obs works after an unexpected disconnect.
        this.obs.on('ConnectionClosed', () => {
            this.connected = false;
        });
        this.obs.on('ConnectionError', () => {
            this.connected = false;
        });
    }

    /**
     * Connect to OBS WebSocket
     */
    async connect(url: string, password?: string): Promise<void> {
        try {
            await this.obs.connect(url, password, {
                rpcVersion: 1,
            });
            this.connected = true;
        } catch (error) {
            this.connected = false;
            throw error;
        }
    }

    /**
     * Disconnect from OBS WebSocket
     */
    async disconnect(): Promise<void> {
        await this.obs.disconnect();
        this.connected = false;
    }

    /**
     * Check if connected to OBS
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * Ensure connection before making calls
     */
    private ensureConnected(): void {
        if (!this.connected) {
            throw new Error('Not connected to OBS');
        }
    }

    /**
     * Get list of all scenes
     */
    async getSceneList(): Promise<SceneListResponse> {
        this.ensureConnected();
        const response = await this.obs.call('GetSceneList');
        return response as unknown as SceneListResponse;
    }

    /**
     * Set current program scene by name
     */
    async setCurrentScene(sceneName: string): Promise<void> {
        this.ensureConnected();
        await this.obs.call('SetCurrentProgramScene', { sceneName });
    }

    /**
     * Stop the active stream
     */
    async stopStream(): Promise<void> {
        this.ensureConnected();
        await this.obs.call('StopStream');
    }

    /**
     * Stop the active recording
     */
    async stopRecord(): Promise<void> {
        this.ensureConnected();
        await this.obs.call('StopRecord');
    }

    /**
     * Get screenshot of source or program output
     */
    async getSourceScreenshot(
        sourceName?: string,
        imageFormat: string = 'png'
    ): Promise<string> {
        this.ensureConnected();
        const params: Record<string, unknown> = { imageFormat };
        if (sourceName) {
            params.sourceName = sourceName;
        }
        const response = await this.obs.call('GetSourceScreenshot', params as any);
        return (response as any).imageData;
    }

    /**
     * Set input settings (for Text GDI+, Browser Source, etc.)
     */
    async setInputSettings(
        inputName: string,
        settings: Record<string, unknown>,
        overlay: boolean = true
    ): Promise<void> {
        this.ensureConnected();
        await this.obs.call('SetInputSettings', {
            inputName,
            inputSettings: settings,
            overlay,
        } as any);
    }

    /**
     * Set input volume (0.0 - 1.0)
     */
    async setInputVolume(inputName: string, volume: number): Promise<void> {
        this.ensureConnected();
        await this.obs.call('SetInputVolume', {
            inputName,
            inputVolumeMul: volume,
        } as any);
    }

    /**
     * Set input mute state
     */
    async setInputMute(inputName: string, muted: boolean): Promise<void> {
        this.ensureConnected();
        await this.obs.call('SetInputMute', {
            inputName,
            inputMuted: muted,
        } as any);
    }

    /**
     * Get OBS stats (CPU, FPS, dropped frames)
     */
    async getStats(): Promise<OBSStats> {
        this.ensureConnected();
        const response = await this.obs.call('GetStats');
        return response as unknown as OBSStats;
    }

    /**
     * Get OBS version info
     */
    async getVersion(): Promise<OBSVersion> {
        this.ensureConnected();
        const response = await this.obs.call('GetVersion');
        return response as unknown as OBSVersion;
    }

    /**
     * Enable or disable a scene item (source visibility)
     */
    async setSceneItemEnabled(
        sceneName: string,
        sourceName: string,
        enabled: boolean
    ): Promise<void> {
        this.ensureConnected();

        // First get the scene item ID
        const { sceneItemId } = await this.obs.call('GetSceneItemId', {
            sceneName,
            sourceName,
        } as any) as any;

        // Then set its enabled state
        await this.obs.call('SetSceneItemEnabled', {
            sceneName,
            sceneItemId,
            sceneItemEnabled: enabled,
        } as any);
    }

    /**
     * Get the raw OBS WebSocket instance for advanced operations
     */
    getRawClient(): OBSWebSocket {
        return this.obs;
    }
}
