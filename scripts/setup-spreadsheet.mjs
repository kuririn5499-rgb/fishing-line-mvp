/**
 * 遊漁船業務管理スプレッドシート 自動作成スクリプト
 *
 * 実行方法:
 *   cd fishing-line-mvp
 *   node scripts/setup-spreadsheet.mjs
 *
 * 処理内容:
 *   1. .env.local のサービスアカウント認証情報を読み込む
 *   2. "遊漁船業務管理" という名前のスプレッドシートを新規作成
 *   3. 4シート（予約・乗船名簿・出船前点検・乗務記録）を作成してヘッダー行を書き込む
 *   4. .env.local の GOOGLE_SPREADSHEET_ID を自動更新
 */

import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, "..", ".env.local");

// ── .env.local パーサー ──────────────────────────────────────────────────────
function parseEnvFile(content) {
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // ダブルクォート除去
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[key] = val;
  }
  return env;
}

// ── シート定義 ─────────────────────────────────────────────────────────────
const SHEETS = [
  {
    title: "予約",
    headers: [
      "出船日", "予約コード", "便ID", "お名前",
      "乗船人数", "ステータス", "メモ", "予約日時",
    ],
  },
  {
    title: "乗船名簿",
    headers: [
      "出船日", "氏名", "年齢", "電話番号", "住所", "緊急連絡先電話番号", "備考",
    ],
  },
  {
    title: "出船前点検",
    headers: [
      "出船日", "船名", "天候", "風力", "波浪", "視界",
      "船体", "排水", "燃料", "燃料弁", "エンジン油", "冷却水", "バッテリー",
      "救命設備", "無線", "法定備品", "救助はしご", "乗降ステップ",
      "釣具", "計器類", "冷却水確認", "エンジン確認",
      "アルコール", "船員状態",
      "不具合事項", "点検者", "点検場所", "アルコール数値", "備考",
      "出船判断", "中止理由", "検査日時",
    ],
  },
  {
    title: "乗務記録",
    headers: [
      "出船日", "船名", "出港時刻", "帰港時刻", "出港場所", "帰港場所",
      "船長名", "乗船者数", "釣り場", "天候", "海況",
      "漁獲概要", "事故報告", "緊急連絡記録", "運航者所見", "安全指導",
      "備考", "記録日時",
    ],
  },
];

// ── ヘッダー書式（青背景・白太字）───────────────────────────────────────────
function headerFormatRequest(sheetId) {
  return {
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.18, green: 0.42, blue: 0.72 },
          textFormat: {
            bold: true,
            foregroundColor: { red: 1, green: 1, blue: 1 },
            fontSize: 10,
          },
        },
      },
      fields: "userEnteredFormat(backgroundColor,textFormat)",
    },
  };
}

// ── 列幅自動調整リクエスト ────────────────────────────────────────────────────
function autoResizeRequest(sheetId, columnCount) {
  return {
    autoResizeDimensions: {
      dimensions: {
        sheetId,
        dimension: "COLUMNS",
        startIndex: 0,
        endIndex: columnCount,
      },
    },
  };
}

// ── 行固定リクエスト（ヘッダー1行を凍結）────────────────────────────────────
function freezeRowRequest(sheetId) {
  return {
    updateSheetProperties: {
      properties: {
        sheetId,
        gridProperties: { frozenRowCount: 1 },
      },
      fields: "gridProperties.frozenRowCount",
    },
  };
}

// ── メイン ────────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(ENV_PATH)) {
    console.error("ERROR: .env.local が見つかりません:", ENV_PATH);
    process.exit(1);
  }

  const envContent = fs.readFileSync(ENV_PATH, "utf-8");
  const env = parseEnvFile(envContent);

  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !rawKey || rawKey.includes("your-sa")) {
    console.error("ERROR: .env.local に GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY が設定されていません");
    process.exit(1);
  }

  // --id=xxx 引数でスプレッドシートIDを受け取る
  const idArg = process.argv.find((a) => a.startsWith("--id="));
  const manualId = idArg ? idArg.slice(5).trim() : null;

  const key = rawKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ],
  });

  const sheets = google.sheets({ version: "v4", auth });

  let spreadsheetId;
  let createRes;

  if (manualId) {
    // 既存のスプレッドシートを使用
    spreadsheetId = manualId;
    console.log(`📊 既存スプレッドシート (${spreadsheetId}) を初期化中...`);

    // 既存シート情報を取得
    createRes = await sheets.spreadsheets.get({ spreadsheetId });
  } else {
    // 新規作成
    console.log("📊 スプレッドシートを作成中...");

    createRes = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: "遊漁船業務管理",
          locale: "ja_JP",
          timeZone: "Asia/Tokyo",
        },
        sheets: SHEETS.map((s, i) => ({
          properties: { sheetId: i + 1, title: s.title, index: i },
        })),
      },
    });

    spreadsheetId = createRes.data.spreadsheetId;
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  console.log(`✅ 接続確認: ${url}`);

  // 現在のシートIDマップを作成
  const sheetIdMap = {};
  for (const s of createRes.data.sheets ?? []) {
    const title = s.properties?.title;
    const id = s.properties?.sheetId;
    if (title && id != null) sheetIdMap[title] = id;
  }

  // 既存モードの場合、不足しているシートを追加
  if (manualId) {
    const addRequests = SHEETS
      .filter((s) => !(s.title in sheetIdMap))
      .map((s) => ({
        addSheet: { properties: { title: s.title } },
      }));

    if (addRequests.length > 0) {
      console.log(`📋 シートを追加中: ${addRequests.map((r) => r.addSheet.properties.title).join(", ")}`);
      const addRes = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: addRequests },
      });
      // 追加されたシートのIDを記録
      for (const reply of addRes.data.replies ?? []) {
        const props = reply.addSheet?.properties;
        if (props?.title && props.sheetId != null) {
          sheetIdMap[props.title] = props.sheetId;
        }
      }
    }
  }

  // ヘッダー行を各シートに書き込む（既存行がなければ書き込む）
  console.log("📝 ヘッダー行を書き込み中...");
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: SHEETS.map((s) => ({
        range: `${s.title}!A1`,
        values: [s.headers],
      })),
    },
  });

  // 書式設定・列幅・行固定を一括適用
  console.log("🎨 書式を設定中...");
  const formatRequests = [];
  for (const s of SHEETS) {
    const sid = sheetIdMap[s.title];
    if (sid == null) continue;
    formatRequests.push(headerFormatRequest(sid));
    formatRequests.push(autoResizeRequest(sid, s.headers.length));
    formatRequests.push(freezeRowRequest(sid));
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: formatRequests },
  });

  // デフォルトシート "シート1" / "Sheet1" を削除（あれば）
  const defaultSheet = (createRes.data.sheets ?? []).find((s) => {
    const t = s.properties?.title;
    return (t === "Sheet1" || t === "シート1") && !SHEETS.some((d) => d.title === t);
  });
  if (defaultSheet?.properties?.sheetId != null) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ deleteSheet: { sheetId: defaultSheet.properties.sheetId } }],
      },
    }).catch(() => {});
  }

  // .env.local の GOOGLE_SPREADSHEET_ID を更新
  const updatedEnv = envContent.replace(
    /^GOOGLE_SPREADSHEET_ID=.*$/m,
    `GOOGLE_SPREADSHEET_ID=${spreadsheetId}`
  );
  fs.writeFileSync(ENV_PATH, updatedEnv, "utf-8");
  console.log("✅ .env.local の GOOGLE_SPREADSHEET_ID を更新しました");

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 セットアップ完了！");
  console.log(`📊 URL: ${url}`);
  if (!manualId) {
    console.log("\n⚠️  次の手順（必須）:");
    console.log(`   1. 上記 URL をブラウザで開く`);
    console.log(`   2. 右上の「共有」をクリック`);
    console.log(`   3. 以下のアドレスを「編集者」として追加:`);
    console.log(`      ${email}`);
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((err) => {
  console.error("ERROR:", err.message ?? err);
  if (err.response?.data) {
    console.error("詳細:", JSON.stringify(err.response.data, null, 2));
  }
  if (err.code) console.error("コード:", err.code);
  if (err.status) console.error("ステータス:", err.status);
  process.exit(1);
});
