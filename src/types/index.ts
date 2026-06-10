/**
 * OBS ShowRunner MCP Server - Type Definitions
 */

// ============================================================================
// Audio Types
// ============================================================================

/**
 * Audio mood presets for controlling audio mix profiles
 */
export type AudioMood =
    | 'talk'
    | 'game_focus'
    | 'hype'
    | 'cinema'
    | 'celebration'
    | 'mute_all';

/**
 * Audio profile configuration for each mood
 */
export interface AudioProfile {
    mic: number; // 0.0 - 1.0
    bgm: number;
    game: number;
    se: number;
}

/**
 * Audio mood profiles mapping
 */
export const AUDIO_MOOD_PROFILES: Record<AudioMood, AudioProfile> = {
    talk: { mic: 1.0, bgm: 0.3, game: 0.2, se: 0.5 },
    game_focus: { mic: 0.8, bgm: 0.2, game: 1.0, se: 0.8 },
    hype: { mic: 1.0, bgm: 0.8, game: 0.6, se: 1.0 },
    cinema: { mic: 0.5, bgm: 1.0, game: 0.8, se: 0.3 },
    celebration: { mic: 1.0, bgm: 1.0, game: 0.3, se: 1.0 },
    mute_all: { mic: 0.0, bgm: 0.0, game: 0.0, se: 0.0 },
};

// ============================================================================
// Safety Types
// ============================================================================

/**
 * Safety mode for controlling dangerous operations
 */
export type SafetyMode = 'strict' | 'normal' | 'debug';

/**
 * Safety configuration
 */
export interface SafetyConfig {
    mode: SafetyMode;
    allowStopStreaming: boolean;
    allowStopRecording: boolean;
}

// ============================================================================
// Show Types
// ============================================================================

/**
 * Segment type presets
 */
export type SegmentType = 'opening' | 'talk' | 'game' | 'ending' | string;

/**
 * Segment template definition
 */
export interface SegmentTemplate {
    id: string;
    name: string;
    type: SegmentType;
    defaultSceneName?: string;
    timerSec?: number;
}

/**
 * Show template definition
 */
export interface ShowTemplate {
    id: string;
    name: string;
    description?: string;
    segments: SegmentTemplate[];
}

/**
 * Runtime segment state
 */
export interface SegmentState {
    id: string;
    name: string;
    type: SegmentType;
    startedAt: number; // Unix timestamp
    timerRemainingSec?: number;
    sceneName?: string;
}

/**
 * Runtime show state
 */
export interface ShowState {
    showId: string | null;
    showName: string | null;
    currentSegment: SegmentState | null;
    segments: SegmentTemplate[];
    overlays: OverlayState[];
    timers: TimerState[];
    startedAt: number | null;
}

// ============================================================================
// Overlay Types
// ============================================================================

/**
 * Overlay state
 */
export interface OverlayState {
    id: string;
    visible: boolean;
    params: Record<string, unknown>;
}

// ============================================================================
// Timer Types
// ============================================================================

/**
 * Timer state
 */
export interface TimerState {
    id: string;
    label: string;
    remainingSec: number;
    isRunning: boolean;
}

// ============================================================================
// Effect Types
// ============================================================================

/**
 * Effect type presets
 */
export type EffectType =
    | 'hype'
    | 'focus'
    | 'alert'
    | 'celebration'
    | 'confetti'
    | string;

// ============================================================================
// Highlight Types
// ============================================================================

/**
 * Highlight marker
 */
export interface Highlight {
    id: string;
    description?: string;
    timestamp: number; // Unix timestamp
    streamTimeSec?: number; // Time since stream start
}

// ============================================================================
// OBS Connection Types
// ============================================================================

/**
 * OBS connection configuration
 */
export interface OBSConnectionConfig {
    websocketUrl: string;
    password?: string;
}
