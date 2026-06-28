# Wordline

ハイライトした英文記事のスクショから、単語帳と「気になった点」メモを自動でつくる単一ページの学習アプリ。
すべてブラウザ内で動き、データは端末内（IndexedDB）に保存。任意で Google ログインによりクラウド同期（Firebase）も可能。

- 読み取り: スクショを読み込み、記事を読みやすく再構成。暖色ハイライト→単語カード、寒色ハイライト→メモ。
- ストック: 単語・メモ・記事を蓄積。単語は SRS（覚えた/まだ）で復習管理。メモには後から「自分のメモ」を追記可能。
- テスト: 4択クイズ（意味あて／単語あて／穴埋め）。
- 設定: Anthropic API キー（必須）、クラウド同期（任意）、バックアップの書き出し／取り込み。

---

## デプロイ手順（GitHub → Netlify）

### 0. 前提
- GitHub アカウント
- Netlify アカウント（GitHub でサインイン可）
- Git がインストール済みのPC（または GitHub のWeb UI でアップロードでも可）

### 1. このフォルダを GitHub リポジトリにする
ターミナルでこのフォルダ（`index.html` がある場所）に移動し、以下を実行:

```bash
git init
git add .
git commit -m "Wordline 初版"
git branch -M main
# GitHub で空のリポジトリ（例: wordline）を作成してから:
git remote add origin https://github.com/<あなたのユーザー名>/wordline.git
git push -u origin main
```

> GitHub の「New repository」では README/.gitignore を**追加しない**で空のまま作るのが簡単です。

### 2. Netlify に接続して自動デプロイ
1. Netlify にログイン → **Add new site → Import an existing project**
2. **GitHub** を選び、先ほどの `wordline` リポジトリを選択
3. ビルド設定はそのままでOK（Build command は空、Publish directory は `.`）。`netlify.toml` があるので基本そのまま進めて「Deploy」
4. 数十秒で `https://<ランダム名>.netlify.app` が発行されます。**Site settings → Change site name** で好きなサブドメインに変更可（例: `wordline.netlify.app`）。

> 以後は `git push` するたびに自動で再デプロイされます。

#### （代替）GitHub Pages で公開する場合
Netlify の代わりに GitHub Pages でも可。リポジトリの **Settings → Pages → Source: Deploy from a branch → main / (root)** を選ぶと
`https://<ユーザー名>.github.io/wordline/` で公開されます。※この場合 `start_url`/`scope` はサブパス配下になります。

### 3. アプリを使い始める
公開URLを開き、**設定タブ**で **Anthropic API キー**を登録（端末内のみ保存。リポジトリには含まれません）。これで読み取りが使えます。

### 4. （任意）Google ログイン＝クラウド同期の設定
複数端末で同じ単語・メモを使いたい場合に設定します。**自分の無料 Firebase プロジェクトが必要**です。

1. https://console.firebase.google.com/ でプロジェクトを作成
2. **Authentication → Sign-in method → Google** を有効化
3. **Firestore Database** を作成（本番モード推奨。下記ルールを設定）
4. **プロジェクトの設定 → マイアプリ → ウェブアプリを追加**し、表示される `firebaseConfig` をコピー
5. **Authentication → Settings → 承認済みドメイン**に、Netlify の公開ドメイン（例 `wordline.netlify.app`）を追加
6. Wordline の **設定 → アカウント → Firebase 設定** に `firebaseConfig`（JSON）を貼り付けて保存 → 「Google でログイン」

#### Firestore セキュリティルール（自分だけが読み書き）
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

> 同期対象は単語・メモ・本文・要点・自分のメモ。記事の元画像は容量のためクラウド同期しません（各端末で読み込んだ分のみ表示）。

### 5. ホーム画面に追加（アプリのように使う）
- iPhone（Safari）: 共有 → 「ホーム画面に追加」。アイコンと Wordline 名で全画面起動。
- Android（Chrome）: メニュー → 「アプリをインストール」。

### 6. 更新の反映
ファイルを編集 → コミット → プッシュするだけ:
```bash
git add .
git commit -m "更新内容"
git push
```
Netlify が自動で再デプロイします。

---

## 同梱ファイル
- `index.html` … アプリ本体（単一ファイル）
- `manifest.webmanifest` … ホーム画面/インストール用
- `wordline-icon-*.png` … アイコン
- `netlify.toml` … Netlify 設定（ビルドなし・静的配信）
- `.gitignore`

## メモ
- Anthropic API キー・Firebase 設定はアプリ内（端末のIndexedDB）に保存され、リポジトリには含まれません。
- キーは絶対にリポジトリへコミットしないでください。
