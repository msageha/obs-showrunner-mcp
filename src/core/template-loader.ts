/**
 * Show Template Loader
 * Loads show templates from a JSON file with schema validation
 */

import { readFileSync } from 'fs';
import { z } from 'zod';
import type { ShowTemplate } from '../types/index.js';

const audioMoodSchema = z.enum([
    'talk',
    'game_focus',
    'hype',
    'cinema',
    'celebration',
    'mute_all',
]);

const segmentTemplateSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.string().min(1),
    defaultSceneName: z.string().optional(),
    defaultOverlays: z.array(z.string()).optional(),
    defaultAudioMood: audioMoodSchema.optional(),
    timerSec: z.number().positive().optional(),
});

const showTemplateSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    segments: z.array(segmentTemplateSchema).min(1),
    defaultBgmProfile: z.string().optional(),
    defaultAudioMood: audioMoodSchema.optional(),
});

const templatesFileSchema = z.union([
    showTemplateSchema,
    z.array(showTemplateSchema),
]);

/**
 * Built-in template registered under the id "default" so start_show works
 * without any external configuration. Segments carry no scene names, so
 * starting a show never fails on a missing OBS scene out of the box.
 */
export const DEFAULT_SHOW_TEMPLATE: ShowTemplate = {
    id: 'default',
    name: 'Default Show',
    description:
        'Built-in show template with opening, main, and ending segments.',
    segments: [
        { id: 'opening', name: 'Opening', type: 'opening', timerSec: 300 },
        { id: 'main', name: 'Main', type: 'talk' },
        { id: 'ending', name: 'Ending', type: 'ending', timerSec: 300 },
    ],
};

/**
 * Load show templates from a JSON file.
 * The file may contain a single template object or an array of templates.
 * Throws with a descriptive message on read/parse/validation failure.
 */
export function loadTemplatesFromFile(filePath: string): ShowTemplate[] {
    let raw: string;
    try {
        raw = readFileSync(filePath, 'utf-8');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to read show templates file '${filePath}': ${message}`);
    }

    let json: unknown;
    try {
        json = JSON.parse(raw);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Invalid JSON in show templates file '${filePath}': ${message}`);
    }

    const result = templatesFileSchema.safeParse(json);
    if (!result.success) {
        const issues = result.error.issues
            .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
            .join('; ');
        throw new Error(`Invalid show template in '${filePath}': ${issues}`);
    }

    return Array.isArray(result.data) ? result.data : [result.data];
}
