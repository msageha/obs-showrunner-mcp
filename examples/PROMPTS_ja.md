# OBS MCP Usage Examples & Prompts

このドキュメントでは、OBS MCPサーバーを活用するための具体的なプロンプト例を紹介します。
AIアシスタント（Claude, Geminiなど）にこれらのプロンプトを投げることで、OBSの操作を自動化・効率化できます。

---

## 前提条件

### 必須
- **OBS Studio** が起動していること。
- OBSの **WebSocketサーバー** が有効になっていること（ツール → WebSocketサーバー設定）。
- **OBS MCPサーバー** が起動し、AIアシスタントに接続されていること。

### OBSソース設定（推奨）
以下のソース名がOBS内に存在することで、全機能をスムーズに利用できます。
（異なる名前の場合は `.env` で設定するか、AIへの指示時に明示してください）

| 用途 | デフォルト名 | .env 設定キー |
|------|--------------|---------------|
| マイク音声 | `Mic/Aux` | `OBS_MIC_INPUT_NAME` |
| BGM | `BGM` | `OBS_BGM_INPUT_NAME` |
| ゲーム音 | `Game Audio` | `OBS_GAME_INPUT_NAME` |
| 効果音 | `Sound Effects` | `OBS_SE_INPUT_NAME` |

### 利用可能なツール一覧
| ツール名 | 機能 |
|----------|------|
| `get_obs_health` | OBS接続状態・FPS・CPU使用率を確認 |
| `reconnect_obs` | OBSへ再接続 |
| `get_scene_list` | シーン一覧を取得 |
| `set_scene` | プログラムシーンを切り替え |
| `set_audio_mood` | 音声プロファイル適用 (talk/game_focus/hype/cinema/celebration/mute_all) |
| `trigger_effect` | 視覚エフェクトを発火 |
| `mark_highlight` | ハイライトポイントにマーク |
| `take_stream_snapshot` | スクリーンショット取得（ソース名を指定） |
| `update_source_content` | テキスト/ブラウザ/画像ソースの内容を更新 |
| `show_overlay` / `hide_overlay` | オーバーレイの表示/非表示 |
| `set_safety_mode` | セーフティモードを設定 (strict/normal/debug) |
| `get_current_show_state` | 現在のショー状態を取得 |

---

## 1. AI Director Mode (番組進行)
配信のオープニングから本編、エンディングまでの流れをAIに任せるケースです。

**OBS前提:**
- 「オープニング」「雑談」「エンディング」という名前のシーンがOBSに存在すること。

**Prompt:**
> 私はこれから配信を始めます。あなたは私の「AIディレクター」として振る舞ってください。
> 以下の手順で番組を進行してください：
> 1. まず、OBSの接続状態を確認してください (`get_obs_health`)。
> 2. 問題なければ、「オープニング」シーンに切り替えてください (`set_scene`)。
> 3. 私が「本編スタート」と言ったら、「雑談」シーンに切り替えて、BGMを少し下げてください (`set_scene`, `set_audio_mood: talk`)。
> 4. 最後は「エンディング」シーンにして配信を終了してください。

**期待される動作:**
- OBS接続確認 → シーン切り替え → 音声調整の自動化

---

## 2. Highlight Clipper (名場面クリップ)
配信中に面白いことが起きた瞬間に、AIに指示してハイライトを記録するケースです。

**OBS前提:**
- スナップショットを撮りたいシーン名を把握していること（例：「ゲーム画面」）。

**Prompt:**
> 今のプレイ、すごく良かった！
> 「神プレイが出た」というメモ付きでハイライトをマークして (`mark_highlight`)。
> ついでに画面上に紙吹雪のエフェクトを出して盛り上げて (`trigger_effect: confetti`)。
> 「ゲーム画面」シーンのスクリーンショットも撮っておいて (`take_stream_snapshot`)。

**期待される動作:**
- ハイライトタイムスタンプの記録
- confettiエフェクトのトリガー
- 指定シーンのスナップショット取得

---

## 3. Dynamic Overlay (動的テロップ更新)
配信中の話題に合わせて、画面上のテキストソースをリアルタイムに更新するケースです。

**OBS前提:**
- 「TopicText」という名前の **テキスト(GDI+)** ソースがシーン内に存在すること。

**Prompt:**
> 今、話題が「MCPサーバーのデバッグ」に移りました。
> OBS上の「TopicText」というテキストソースの内容を、「現在：MCPサーバーのデバッグ中...」に更新してください (`update_source_content`)。
> また、少し真面目な話なので、BGMを少し落として「Cinema」ムードにしてください (`set_audio_mood: cinema`)。

**期待される動作:**
- テロップがリアルタイムで書き換わる
- 音声バランスが落ち着いた雰囲気に変更される

---

## 4. Audio Engineer (音声トラブルシューティング)
音声がおかしい、聞こえないなどのトラブル時に診断を依頼するケースです。

**OBS前提:**
- `.env` にマイク/BGM/ゲーム音のソース名が正しく設定されていること。

**Prompt:**
> 視聴者から「ゲーム音がうるさくて声が聞こえない」と言われました。
> 現在のショー状態を確認してください (`get_current_show_state`)。
> 「Talk」モードに切り替えて、私の声を優先するようにしてください (`set_audio_mood: talk`)。

**期待される動作:**
- 現在の状態確認
- 音声プロファイルの適用（マイク音量UP、ゲーム音量DOWN）

---

## 5. Safety First (安全運転モード)
誤操作を防ぎたい場合の設定です。

**Prompt:**
> これから重要な会議の配信を行うので、間違っても配信が止まらないようにしたいです。
> セーフティモードを「strict」に設定してください (`set_safety_mode: strict`)。

**期待される動作:**
- セーフティモードが「strict」に変更される
- 危険な操作（end_show の stop_streaming オプションなど）がブロックされる

---

## ヒント
- **ソース名:** `.env` でカスタマイズ可能です（例：`OBS_MIC_INPUT_NAME=音声入力キャプチャ 2`）。
- **シーン名:** `get_scene_list` でOBS内のシーン一覧を取得してから指定すると確実です。
- **エフェクト:** `trigger_effect` で使えるエフェクトタイプは実装依存です（例：confetti, flash など）。
