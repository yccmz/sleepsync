# Sleep Sync — Agent Design Rules

このファイルはエージェントが **design-rules.md** の仕様を確実にアプリへ反映させるための強制ルールです。
UIに関するコードを書く際は、以下のルールを**必ず**遵守してください。

---

## ✅ 必須チェックリスト（コード作成・編集のたびに確認）

UIコードを変更する前に、以下を確認してください。

- [ ] カラーパレットは仕様書の値を使用しているか
- [ ] フォントは用途に応じてSerifとSans-serifを使い分けているか
- [ ] 背景ぼかし・グラデーション・影が仕様通りか
- [ ] ステータス別のスタイル（Next/Overdue/Completed）が正確に実装されているか
- [ ] アンチパターン（ネオン、シャープな線、明るすぎる背景）を使っていないか

---

## 1. カラーパレット（厳守）

コード内でカラー値を指定する際は、**必ず以下の定義値を使用**してください。勝手な色を追加・変更しないでください。

| 用途 | カラー値 |
|------|---------|
| ベース背景 | `#0f1423` |
| アプリコンテナ背景 | `#13192b` (opacity 60%) |
| カード背景 (標準) | `#1e293b` (opacity 40〜80%) |
| 枠線 (標準) | `#334155` (opacity 50%) |
| テキスト (基本) | `#e2e8f0` |
| テキスト (薄め) | `#94a3b8` |
| テキスト (無効・完了) | `#64748b` |
| アクセント: Indigo | `#4f46e5` / `#6366f1` |
| アクセント: Amber | `#f59e0b` / `#fbbf24` / `#fcd34d` |
| タイトルグラデーション | `#fef3c7` → `#fcd34d` (opacity 70%) |
| エラー・遅延背景 | `#4c0519` (opacity 20%) |
| エラー・遅延枠線 | `#881337` (opacity 50%) |
| エラー・遅延テキスト | `#ffe4e6` |
| おやすみ背景 | `#050814` |

---

## 2. フォント使い分けルール

```
Serif（明朝体）  → アプリタイトル "Sleep Sync"、日付、時刻表示、「おやすみなさい」
Sans-serif（ゴシック）→ ラベル、バッジ、サブテキスト、タスク名など一般テキスト
```

- `text-2xl tracking-wide font-serif` → アプリタイトル
- `text-3xl tracking-widest font-serif` → おやすみモードタイトル
- `text-lg font-bold` (sans) → タイムラインの時刻値

---

## 3. 背景レイヤー（必須実装）

すべての画面で以下の背景装飾を必ず含めること。

```html
<!-- 背景装飾ブロブ -->
<div class="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
  <!-- Indigo blob: 左上 -->
  <div style="width:384px;height:384px;background:#4f46e5;opacity:0.10;
              filter:blur(100px);position:absolute;top:0;left:0;border-radius:50%"></div>
  <!-- Amber blob: 右下 -->
  <div style="width:320px;height:320px;background:#f59e0b;opacity:0.05;
              filter:blur(80px);position:absolute;bottom:0;right:0;border-radius:50%"></div>
  <!-- 星屑: 複数の小円 (1〜6px, opacity 30〜50%) をランダム配置 -->
</div>
```

---

## 4. コンポーネント別スタイル仕様

### 4-1. アプリコンテナ

```css
max-width: 448px;
background: rgba(19, 25, 43, 0.6);
backdrop-filter: blur(24px);
border-left: 1px solid rgba(30, 41, 59, 0.5);
border-right: 1px solid rgba(30, 41, 59, 0.5);
box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8);
```

### 4-2. 目標サマリーカード

```css
background: rgba(30, 41, 59, 0.4);
backdrop-filter: blur(12px);
border: 1px solid rgba(51, 65, 85, 0.5);
border-radius: 16px;
padding: 16px;
```

### 4-3. タスクカード — ステータス別

| ステータス | 背景 | 枠線 | テキスト | その他 |
|-----------|------|------|---------|--------|
| Pending | `#1e293b` 50% | `#334155` 50% | `#f1f5f9` | — |
| Next | `#1e293b` 80% | `#f59e0b` 30% | `#f1f5f9` | Amber系のbox-shadow |
| Overdue | `#4c0519` 20% | `#881337` 50% | `#ffe4e6` | — |
| Completed | `#1e293b` 30% | `#334155` 30% | `#64748b` | `text-decoration: line-through` |

- 自分のカード: 通常スタイル。右上角丸のみ `2px`（吹き出し効果）
- パートナーのカード: `opacity: 0.6`、左上角丸のみ `2px`

### 4-4. タイムライン中央線

```css
width: 1px;
background: linear-gradient(to bottom, #1e293b, rgba(51,65,85,0.5), transparent);
```

### 4-5. タイムライン中央ドット（ステータス別色）

| ステータス | 色 | 追加効果 |
|-----------|-----|---------|
| 完了 | `#475569` | — |
| 遅延 | `#fb7185` | — |
| 次 (Next) | `#fbbf24` | `box-shadow: 0 0 8px 2px rgba(251,191,36,0.6)` |
| 未完了 | `#64748b` | — |

外枠（切り抜き効果）: `ring-4 ring-[#13192b]`

### 4-6. デジタルデトックスバナー

```css
background: rgba(30, 27, 75, 0.8);
backdrop-filter: blur(8px);
border: 1px solid rgba(99, 102, 241, 0.3);
border-radius: 9999px;
box-shadow: 0 0 15px rgba(79, 70, 229, 0.15);
```

### 4-7. おやすみモード専用

```css
/* 全体背景 */
background: #050814;

/* 月の光（背景ぼかし円） */
width: 256px; height: 256px;
background: #fef3c7; opacity: 0.05;
filter: blur(60px);
border-radius: 50%;

/* メインアイコン */
color: rgba(254, 243, 199, 0.8);
filter: drop-shadow(0 0 15px rgba(254,243,199,0.3));
animation: pulse 2s infinite;

/* 明日のバッジ */
background: rgba(15, 23, 42, 0.5);
border: 1px solid #1e293b;
border-radius: 9999px;
padding: 12px 24px;
```

### 4-8. タスクカウントダウンバッジ

```css
background: rgba(245, 158, 11, 0.2);
color: #fcd34d;
animation: pulse 2s infinite;
```

### 4-9. トースト通知

```css
position: fixed; bottom: 96px;
background: rgba(30, 41, 59, 0.9);
backdrop-filter: blur(12px);
border: 1px solid rgba(245, 158, 11, 0.2);
border-radius: 16px;
box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8);

/* 星アイコンコンテナ */
background: rgba(245, 158, 11, 0.2);
color: #fcd34d;
border-radius: 50%;
```

---

## 5. アンチパターン（禁止事項）

以下は **絶対に使用しないでください**。

- ❌ 純粋な白 (`#ffffff`) や明るいグレーの背景
- ❌ ネオン系・蛍光系のカラー（仕様書にない鮮やかな色）
- ❌ シャープすぎる枠線（`border-width: 2px` 以上、かつ不透明）
- ❌ `border-radius: 0` （角丸なし）のカード
- ❌ フォントの使い分けを無視した実装（タイトルにSans-serif、ラベルにSerifなど）
- ❌ `backdrop-filter` なしのカード・モーダル
- ❌ 背景装飾ブロブや星屑の省略

---

## 6. 参照ファイル

UIを実装・修正するとき、**必ず以下のファイルを参照**してください。

- [`design-rules.md`](../design-rules.md) — ビジュアル仕様の正本
- [`detox-messages.md`](../detox-messages.md) — デジタルデトックスのメッセージ文言
- [`requirements.md`](../requirements.md) — 機能要件

---

> **注意:** このルールファイルが `design-rules.md` と矛盾する場合は、**`design-rules.md` の内容を優先**してください。
