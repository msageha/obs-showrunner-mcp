# OBS MCP Usage Examples & Prompts

This document provides practical prompt examples for using the OBS MCP server.
By sending these prompts to an AI assistant (Claude, Gemini, etc.), you can automate and streamline OBS operations.

---

## Prerequisites

### Required
- **OBS Studio** must be running.
- OBS **WebSocket Server** must be enabled (Tools → WebSocket Server Settings).
- **OBS MCP Server** must be running and connected to the AI assistant.

### OBS Source Configuration (Recommended)
Having these source names in OBS enables smooth operation of all features.
(If you use different names, configure them in `.env` or specify them explicitly in your prompts.)

| Purpose | Default Name | .env Configuration Key |
|---------|--------------|------------------------|
| Microphone | `Mic/Aux` | `OBS_MIC_INPUT_NAME` |
| BGM | `BGM` | `OBS_BGM_INPUT_NAME` |
| Game Audio | `Game Audio` | `OBS_GAME_INPUT_NAME` |
| Sound Effects | `Sound Effects` | `OBS_SE_INPUT_NAME` |

### Available Tools Reference
| Tool Name | Function |
|-----------|----------|
| `get_obs_health` | Check OBS connection status, FPS, CPU usage |
| `reconnect_obs` | Reconnect to OBS |
| `get_scene_list` | Get list of scenes |
| `set_scene` | Switch program scene |
| `set_audio_mood` | Apply audio profile (talk/game_focus/hype/cinema/celebration/mute_all) |
| `trigger_effect` | Trigger visual effects |
| `mark_highlight` | Mark a highlight point |
| `take_stream_snapshot` | Take screenshot (specify source name) |
| `update_source_content` | Update text/browser/image source content |
| `show_overlay` / `hide_overlay` | Show/hide overlay |
| `set_safety_mode` | Set safety mode (strict/normal/debug) |
| `get_current_show_state` | Get current show state |

---

## 1. AI Director Mode (Show Progression)
Let the AI handle the flow from opening to main content to ending.

**OBS Prerequisites:**
- Scenes named "Opening", "Main", and "Ending" must exist in OBS.

**Prompt:**
> I'm about to start streaming. Please act as my "AI Director".
> Follow these steps to run the show:
> 1. First, check the OBS connection status (`get_obs_health`).
> 2. If everything looks good, switch to the "Opening" scene (`set_scene`).
> 3. When I say "Start the main show", switch to the "Main" scene and lower the BGM a bit (`set_scene`, `set_audio_mood: talk`).
> 4. Finally, switch to the "Ending" scene to wrap up the stream.

**Expected Behavior:**
- OBS connection check → Scene switching → Audio adjustment automation

---

## 2. Highlight Clipper
When something exciting happens during the stream, have the AI record a highlight.

**OBS Prerequisites:**
- Know the scene name you want to capture (e.g., "Gameplay").

**Prompt:**
> That play was amazing!
> Mark a highlight with the note "Epic play moment" (`mark_highlight`).
> Also, trigger a confetti effect on screen to celebrate (`trigger_effect: confetti`).
> Take a screenshot of the "Gameplay" scene too (`take_stream_snapshot`).

**Expected Behavior:**
- Highlight timestamp recorded
- Confetti effect triggered
- Screenshot captured from specified scene

---

## 3. Dynamic Overlay (Real-time Text Updates)
Update on-screen text sources in real-time based on the current topic.

**OBS Prerequisites:**
- A **Text (GDI+)** source named "TopicText" must exist in your scene.

**Prompt:**
> The topic has shifted to "MCP Server Debugging".
> Update the "TopicText" source in OBS to display "Current Topic: MCP Server Debugging..." (`update_source_content`).
> Also, this is a more serious topic, so lower the BGM and switch to "Cinema" mood (`set_audio_mood: cinema`).

**Expected Behavior:**
- On-screen text updates in real-time
- Audio balance shifts to a calmer atmosphere

---

## 4. Audio Engineer (Troubleshooting)
Diagnose and fix audio issues during the stream.

**OBS Prerequisites:**
- Microphone/BGM/Game audio source names must be correctly configured in `.env`.

**Prompt:**
> Viewers are saying "The game audio is too loud and I can't hear your voice".
> Check the current show state (`get_current_show_state`).
> Switch to "Talk" mode to prioritize my voice (`set_audio_mood: talk`).

**Expected Behavior:**
- Current state check
- Audio profile applied (Mic volume UP, Game volume DOWN)

---

## 5. Safety First Mode
Prevent accidental operations during important streams.

**Prompt:**
> I'm about to stream an important meeting, so I want to make sure the stream can't accidentally stop.
> Set the safety mode to "strict" (`set_safety_mode: strict`).

**Expected Behavior:**
- Safety mode changes to "strict"
- Dangerous operations (e.g., stop_streaming option in end_show) are blocked

---

## Tips
- **Source Names:** Can be customized in `.env` (e.g., `OBS_MIC_INPUT_NAME=Audio Input Capture 2`).
- **Scene Names:** Use `get_scene_list` to get the list of scenes in OBS before specifying them.
- **Effects:** Available effect types for `trigger_effect` are implementation-dependent (e.g., confetti, flash).
