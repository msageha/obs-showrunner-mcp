/**
 * OBS Adapter - Wrapper for obs-websocket-js
 * Provides a clean interface for OBS WebSocket operations
 */

import OBSWebSocket, { type OBSRequestTypes } from 'obs-websocket-js';

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

export interface ScreenshotOptions {
    imageFormat?: string;
    imageWidth?: number;
    imageCompressionQuality?: number;
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
        // The library types scenes as JsonObject[]; narrow to the known shape.
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
     * Set the current scene transition to a fade and configure its duration.
     * Transition display names are localized, so the fade transition is looked
     * up by kind instead of by name. Returns false when no fade transition
     * exists (best effort; the scene switch itself is unaffected).
     */
    async applySmoothTransition(durationMs: number): Promise<boolean> {
        this.ensureConnected();
        const { transitions } = await this.obs.call('GetSceneTransitionList');
        const fade = (transitions as Array<Record<string, unknown>>).find(
            (t) => t.transitionKind === 'fade_transition'
        );
        if (!fade || typeof fade.transitionName !== 'string') {
            return false;
        }
        await this.obs.call('SetCurrentSceneTransition', {
            transitionName: fade.transitionName,
        });
        await this.obs.call('SetCurrentSceneTransitionDuration', {
            transitionDuration: durationMs,
        });
        return true;
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
     * Get screenshot of a source or scene as a base64 data URI
     */
    async getSourceScreenshot(
        sourceName: string,
        options: ScreenshotOptions = {}
    ): Promise<string> {
        this.ensureConnected();
        const response = await this.obs.call('GetSourceScreenshot', {
            sourceName,
            imageFormat: options.imageFormat ?? 'jpg',
            ...(options.imageWidth !== undefined
                ? { imageWidth: options.imageWidth }
                : {}),
            ...(options.imageCompressionQuality !== undefined
                ? { imageCompressionQuality: options.imageCompressionQuality }
                : {}),
        });
        return response.imageData;
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
            // Settings are plain JSON by construction; the library's JsonObject
            // is just stricter than Record<string, unknown>.
            inputSettings: settings as OBSRequestTypes['SetInputSettings']['inputSettings'],
            overlay,
        });
    }

    /**
     * Set input volume (0.0 - 1.0)
     */
    async setInputVolume(inputName: string, volume: number): Promise<void> {
        this.ensureConnected();
        await this.obs.call('SetInputVolume', {
            inputName,
            inputVolumeMul: volume,
        });
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
        });

        // Then set its enabled state
        await this.obs.call('SetSceneItemEnabled', {
            sceneName,
            sceneItemId,
            sceneItemEnabled: enabled,
        });
    }
}
