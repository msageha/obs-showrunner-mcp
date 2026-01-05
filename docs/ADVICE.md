ご提示いただいた「OBS ShowRunner MCP Server」の仕様書は、**「AIによる演出意図の実現」と「OBSの低レベル操作」を見事に分離**しており、非常に実現性が高く、かつ実用的な構成になっています。特に「ショー状態管理（State Manager）」を挟むアーキテクチャは、LLMがコンテキストを見失わずに進行するために不可欠な要素です。

この素晴らしい土台をさらに洗練させ、**「AIがより自律的かつ創造的なディレクターとして振る舞える」**ようにするための改善案と、それを反映したブラッシュアップ版の仕様を提案します。

---

### 🔍 レビューと改善のポイント

この仕様を「実用レベル」から「プロフェッショナルなAIディレクター」へ引き上げるための主要な改善点は以下の4点です。

#### 1. 「視覚」の付与（Multimodal対応）

現在の仕様は「操作」が中心ですが、AIが本当に演出を行うなら**「現在の画面がどうなっているか」を見る能力**が必要です。

* **追加:** `get_stream_snapshot` (現在の配信画面のスクリーンショットを取得)
* **理由:** テロップが被っていないか、カメラの映りが適切か、ゲーム画面の状況（勝利/敗北）を視覚的に確認して演出を決定するため。

#### 2. 静的シーンから「動的コンテンツ注入」への拡張

シーンの切り替えだけでなく、**シーンの中身（テキスト、画像、Webページ）を動的に書き換える**機能があると、演出の幅が劇的に広がります。

* **追加:** `update_source_content` (テキストソースの書き換え、ブラウザソースのURL変更など)
* **理由:** 「今の話題のキーワードを画面隅に表示する」「視聴者のコメントをピックアップして画面中央に出す」といった演出が可能になります。

#### 3. 「Resource」の積極活用（Context Windowの節約）

MCPの `Tools` は操作に使いますが、`Resources` は「コンテキストへの埋め込み」に使えます。

* **改善:** 現在のショー状態（`current_show_state`）や直近のチャットログは、Tool呼び出しではなく `Resource` (URI) として提供し、LLMが常にプロンプトのコンテキストとして参照できるようにします。これにより、**「今の状態」を確認するための余計なTool往復を削減**できます。

#### 4. オーディオミキシングの抽象化（Ducking/Mood）

BGMとマイクのバランスは配信のクオリティに直結します。

* **改善:** `set_audio_mood` の導入。単なるボリューム変更ではなく、「Talk（BGM下げ/マイク上げ）」「Hype（BGM上げ/マイク上げ）」「Cinema（BGMメイン/マイク下げ）」のようなプロファイルベースの制御にします。

---

### 🚀 改善後の仕様書（ブラッシュアップ版）

以下は、上記の改善点を取り込んだ改訂版の仕様書です。

# OBS ShowRunner MCP Server – 機能仕様書 (Rev.2)

## 0. プロジェクト定義

* **名称:** obs-showrunner-mcp
* **コンセプト:** 「AI Director in the Loop」
* 単なるリモコンではなく、**視覚（Vision）と聴覚（Logs/Metrics）を持ち、演出意図（Show Context）を理解してOBSを操作する自律型エージェント**のためのサーバー。



## 1. アーキテクチャ拡張

### 1.1 モジュール構成（変更点のみ）

1. **Vision Adapter (新規)**
* OBSの `GetSourceScreenshot` API を利用し、現在のプログラム映像をBase64画像として提供。
* LLM（GPT-4o / Claude 3.5 Sonnet）が「画面のレイアウト崩れ」や「ゲーム内の状況」を視覚的に判断可能にする。


2. **Dynamic Content Injector (新規)**
* OBS内の `Text GDI+` や `Browser Source` を動的に書き換えるラッパー。
* 「固定シーン」の限界を超え、リアルタイムな情報を画面に反映させる。


3. **Audio Mixer Profile**
* 個別のフェーダー操作ではなく、「ムード（雰囲気）」定義に基づく一括ミキシング制御。



---

## 2. MCP インターフェース仕様 (拡張版)

### 2.1 Resources (状態参照用)

LLMが常に「現在の状況」を把握できるように、以下のデータをリソースとして公開する。

* `obs://state/current`
* 現在のセグメント、残り時間、アクティブなシーン名を含むJSON。


* `obs://logs/chat/recent`
* 直近30件のチャットログ（要約・感情分析用）。


* `obs://catalog/overlays`
* 利用可能なオーバーレイIDとそのパラメータスキーマ一覧。



### 2.2 Tools (操作用)

#### 2.2.1 視覚・確認 (Vision)

1. **`take_stream_snapshot`**
* **目的:** 現在の配信画面（または特定のソース）を画像として取得し、視覚的に状況判断する。
* **入力:** `source_name?` (省略時はProgram Out)
* **出力:** `image_data` (Base64 encoded image)
* **ユースケース:** 「今の画面、ごちゃごちゃしてない？」「ゲームでVictory画面が出たら教えて」



#### 2.2.2 動的演出 (Dynamic Content)

2. **`update_source_content`**
* **目的:** シーン内の特定ソースの内容をリアルタイムに更新する。
* **入力:**
* `source_name`: string (例: "TopicText", "BrowserWidget")
* `content`: string (テキスト内容 または URL)
* `properties?`: object (色、フォントサイズなどのCSS的プロパティ)


* **挙動:** 指定されたソースの種類（Text/Browser/Image）を自動判別して内容を更新。
* **ユースケース:** 「今の話題を画面左上にテロップとして出す」



#### 2.2.3 音響演出 (Audio)

3. **`set_audio_mood`**
* **目的:** 配信の雰囲気に合わせてオーディオミックスを一括変更する。
* **入力:**
* `mood`: "talk" | "game_focus" | "hype" | "cinema" | "mute_all"
* `fade_duration_ms?`: number (デフォルト 2000)


* **挙動:** 事前定義されたプロファイルに基づき、マイク、BGM、ゲーム音、SEのバランスをクロスフェードさせる。



#### 2.2.4 演出エフェクト (拡張)

4. **`trigger_effect` (改善)**
* 既存仕様に加え、`duration` (継続時間) と `auto_revert` (自動で元に戻すか) を追加。
* 例: 「5秒間だけフォーカス演出をして、自動で元のシーンに戻す」といった操作をサーバー側で完結させ、LLMのToken消費とレイテンシを減らす。



#### 2.2.5 進行管理 (Show Control)

* `start_show`, `end_show`, `switch_segment` は原案通り維持。
* **追加: `extend_segment**`
* **目的:** 現在のセグメントの予定時間を延長する。
* **入力:** `minutes`: number
* **理由:** 話が盛り上がった際、AIが自律的に「次のコーナーを遅らせる」判断を反映させるため。



---

## 3. シナリオ例：AIディレクターの自律動作

この拡張仕様により、以下のような高度なやり取りが可能になります。

**状況:** ゲーム配信中、ボス戦でプレイヤーが勝利した直後。

1. **Event:** `Wait_for_event` がチャットの「GG」「おめでとう！」の急増（Engagement Spike）を検知。
2. **Vision (AI):** AIが `take_stream_snapshot` を実行。「Victory」の文字が画面に出ていることを視覚的に確認。
3. **Action 1 (Audio):** `set_audio_mood(mood="celebration")` を実行。BGMが勝利ファンファーレに切り替わり、音量が上がる。
4. **Action 2 (Visual):** `trigger_effect(type="confetti")` で紙吹雪オーバーレイを表示。
5. **Action 3 (Dynamic):** `update_source_content(source="Subtitle", content="ボス撃破！ 15時間の死闘の末...")` でテロップを即座に更新。
6. **Action 4 (Clip):** `mark_highlight(description="ボス撃破の瞬間")` を記録。

---

## 4. 開発ロードマップ（修正案）

### Phase 1: MVP (Core Control)

* OBS WebSocket接続と基本抽象化。
* `switch_segment` (シーン切替), `start/end_show`。
* Resourceによる `current_state` 提供。

### Phase 2: Engagement & Dynamics (Reactive)

* `update_source_content` (テロップ更新) の実装。
* `get_engagement_metrics` とイベントループの実装。
* `set_audio_mood` の実装。

### Phase 3: Vision & Autonomy (Pro Director)

* `take_stream_snapshot` (Vision) の実装。**← ここで一気に差別化**
* AIによる自動クリップ生成連携。

---

### 次のステップの提案

この改善版仕様書で進める場合、**「Phase 1 の実装において、どの言語/フレームワークを使用するか」**が最初の技術的な決定事項になります。

1. **Node.js (TypeScript)**: `obs-websocket-js` が最も成熟しており、MCP SDKも公式対応があるため**推奨**です。
2. **Python**: AI系ライブラリとの親和性は高いですが、WebSocketの非同期処理とMCPサーバーの並立が少し複雑になる場合があります。

よろしければ、**TypeScriptベースでのプロジェクト構成（package.json, tsconfig.json, サーバーのボイラープレートコード）**を作成しましょうか？
