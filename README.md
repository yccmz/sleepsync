# Sleep Sync 🌙

ふたりの夜を、やさしく整える夜間ルーティン管理アプリ

## デモ

デプロイ後のURLをここに記入してください。

---

## 機能

- 📅 就寝・起床時刻から夜のタスクを自動逆算
- 💑 Firebase によるパートナーとのリアルタイム同期
- 📱 デジタルデトックス設定
- ✨ タスク完了時のねぎらいメッセージ
- 🌙 おやすみモード（就寝後の操作ロック）
- ⚡ PWA対応（ホーム画面に追加可能）

---

## セットアップ手順

### 1. Firebase プロジェクトの作成（初回のみ・無料）

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」→ 任意の名前で作成
3. 「Realtime Database」を有効化
   - ロケーション: `asia-southeast1`（シンガポール）推奨
   - セキュリティルール: **テストモード**で開始
4. プロジェクト設定 → 「マイアプリ」→ ウェブアプリを追加
5. 表示された設定値をコピー

### 2. app.js の設定値を書き換える

`app.js` の先頭にある `FIREBASE_CONFIG` に貼り付ける:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "コピーした値",
  authDomain:        "コピーした値",
  databaseURL:       "コピーした値",
  projectId:         "コピーした値",
  storageBucket:     "コピーした値",
  messagingSenderId: "コピーした値",
  appId:             "コピーした値"
};
```

### 3. ルームIDの確認

`app.js` の `ROOM_ID` が夫婦で同じ値になっていることを確認してください（デフォルト: `mizuno-house`）。

---

## GitHub Pages へのデプロイ

```bash
# リポジトリ初期化
git init
git add .
git commit -m "🌙 Sleep Sync initial commit"

# GitHubに新しいリポジトリを作成し、以下を実行:
git remote add origin https://github.com/YOUR_USERNAME/sleep-sync.git
git push -u origin main
```

GitHub リポジトリ → **Settings** → **Pages** → Source: `main` ブランチ / `(root)` フォルダ → **Save**

数分後に `https://YOUR_USERNAME.github.io/sleep-sync/` でアクセス可能になります。

---

## Firebase セキュリティルール（本番用）

Firebase Console → Realtime Database → ルール に貼り付け:

```json
{
  "rules": {
    "rooms": {
      "mizuno-house": {
        ".read":  true,
        ".write": true
      }
    }
  }
}
```

---

## 技術スタック

| 項目 | 内容 |
|------|------|
| フロントエンド | HTML / CSS / Vanilla JS |
| データ同期 | Firebase Realtime Database |
| アイコン | Lucide Icons |
| フォント | Noto Sans JP / Noto Serif JP |
| ホスティング | GitHub Pages |
| PWA | manifest.json + Service Worker |
