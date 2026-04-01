# 遊漁船向け LINE 業務システム MVP

LINE を入口とした遊漁船事業者向け業務システムです。

## 技術スタック

- **Next.js 14** (App Router)
- **TypeScript** (strict)
- **Supabase** (PostgreSQL)
- **LINE LIFF** (認証)
- **LINE Messaging API** (通知配信)
- **Google Sheets API** (ミラー保存)
- **Tailwind CSS**
- **Zod** + **React Hook Form**

## セットアップ

### 1. 依存関係インストール

```bash
npm install
```

### 2. 環境変数設定

```bash
cp .env.local.example .env.local
# .env.local を編集して各種キーを設定
```

### 3. Supabase DB 構築

Supabase Dashboard の SQL Editor で以下を実行:

```
supabase/migrations/001_schema.sql
```

### 4. 初期アカウントデータ投入

```sql
insert into accounts (slug, name, boat_name, liff_id_customer, liff_id_captain)
values ('your-slug', 'あなたの船名', '○○丸', 'liff-xxxxx', 'liff-yyyyy');
```

### 5. 開発サーバー起動

```bash
npm run dev
```

## URL 構成

| URL | 対象 |
|-----|------|
| `/app` | 共通エントリ（role に応じてリダイレクト） |
| `/customer` | 顧客ホーム |
| `/customer/reservations` | 予約一覧・新規予約 |
| `/customer/manifest` | 乗船名簿入力 |
| `/customer/coupons` | クーポン一覧 |
| `/customer/points` | ポイント残高・履歴 |
| `/captain` | 船長ダッシュボード |
| `/captain/trips` | 便管理 |
| `/captain/reservations` | 予約確認 |
| `/captain/manifests` | 名簿一覧確認 |
| `/captain/pre-departure` | 出船前検査 |
| `/captain/duty-log` | 乗務記録 |
| `/captain/fishing-report` | 釣果投稿 |
| `/admin` | 管理ダッシュボード |
| `/admin/users` | ユーザー管理・role 変更 |
| `/admin/settings` | アカウント設定確認 |

## 権限 (role)

| role | 説明 |
|------|------|
| customer | 予約・名簿・クーポン・ポイント |
| staff | 予約確認・名簿確認 |
| captain | staff + 便管理・検査・乗務記録・釣果 |
| operator | captain + アカウント設定・role 変更 |
| admin | 全権限 |

## Google Sheets シート名

自動保存先のシート名（変更不可）:

- `乗船名簿`
- `出船前検査`
- `乗務記録`

## LINE LIFF 設定

- customer 用と captain 用で LIFF アプリを2つ作成してください
- LIFF URL: `https://liff.line.me/{liff-id}`
- Endpoint URL: `https://your-domain.com/customer` (customer) / `/captain` (captain)

## 認証フロー

```
LINE アプリ
  → LIFF 初期化
  → liff.login()（未ログイン時）
  → idToken 取得
  → POST /api/auth?mode=customer|captain
  → LINE サーバーで idToken 検証
  → DB users テーブルで role 確認（未登録なら customer で自動作成）
  → Cookie セッション発行
  → role に応じてページへリダイレクト
```
