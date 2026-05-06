/**
 * 百川學程 115 級｜畢業學位袍清潔維護費繳費登記
 * Google Apps Script 後端：把 index.html 表單送來的資料寫入 Google Sheet
 *
 * 部署方式請見 README.md「部署 Google Apps Script」章節。
 */

// ===================== 基本資料設定 =====================
const SPREADSHEET_ID = 'REPLACE_WITH_YOUR_NEW_SHEET_ID'; // 換成你新建立的 Google Sheet ID
const ADMIN_EMAIL = 'tingyi0966745188@gmail.com';        // 出錯時的通知信箱（可改成你自己的）
const REDIRECT_URL = 'https://thc1006.github.io/nycu-arete-115-grad-clothes/thank-you.html';

// 工作表名稱（Google Sheet 內的分頁名稱）
const PAYMENT_SHEET_NAME = '繳費登記';

// 工作表欄位（從 1 開始）
// A: 學號 | B: 姓名 | C: 繳費狀態 | D: 後五碼 | E: 已勾選確認 | F: 提交時間戳
const COL_STUDENT_ID   = 1;
const COL_STUDENT_NAME = 2;
const COL_PAY_STATUS   = 3;
const COL_LAST5        = 4;
const COL_CONFIRMED    = 5;
const COL_TIMESTAMP    = 6;
// =======================================================


/**
 * 處理 HTML 表單的 POST 請求。
 * @param {GoogleAppsScript.Events.DoPost} e
 */
function doPost(e) {
    let studentId = '未知學號';

    // ---------- 不需 lock 的早期檢查 ----------
    // (a) Fail-fast：管理員是否已替換 SPREADSHEET_ID
    if (SPREADSHEET_ID === 'REPLACE_WITH_YOUR_NEW_SHEET_ID' || !SPREADSHEET_ID) {
        Logger.log('SPREADSHEET_ID 尚未設定，拒絕處理。');
        return _plain('系統尚未完成設定（SPREADSHEET_ID 未填入），請聯絡畢代。');
    }
    // (b) Honeypot：人類看不到 website 欄位，bot 會填
    if (e && e.parameter && e.parameter.website) {
        Logger.log('honeypot triggered, value=' + e.parameter.website);
        return _plain('OK'); // 給 bot 一個假成功，不留痕跡到 Sheet
    }

    // ---------- 真正的處理流程，包進 ScriptLock ----------
    const lock = LockService.getScriptLock();
    try {
        lock.waitLock(30000); // 同時送出時最多排隊 30 秒

        Logger.log('========= 執行開始 =========');
        Logger.log('收到的原始參數: ' + JSON.stringify(_maskSensitive(e.parameter)));

        // 1. 驗證並取得基本參數
        if (!e.parameter.studentId) {
            throw new Error("收到的請求中缺少 'studentId' 參數。");
        }
        studentId = e.parameter.studentId.trim();
        const studentName = (e.parameter.studentName || '未提供').trim();
        const last5 = (e.parameter.last5 || '').trim();
        const paidChecked = (e.parameter.paid === 'yes' || e.parameter.paid === 'on');

        if (!paidChecked) {
            return _plain('錯誤：未勾選「我已完成匯款」確認框。請返回上一頁重新填寫。');
        }
        if (!/^\d{5,6}$/.test(last5)) {
            return _plain('錯誤：後五碼格式不正確（應為 5 或 6 位純數字）。請返回上一頁重新填寫。');
        }

        Logger.log(`已解析參數 - 學號: ${studentId}, 姓名: ${studentName}, 後五碼: ${_maskLast5(last5)}`);

        // 2. 開啟試算表
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        let sheet = ss.getSheetByName(PAYMENT_SHEET_NAME);
        if (!sheet) {
            sheet = ss.insertSheet(PAYMENT_SHEET_NAME);
            sheet.appendRow(['學號', '姓名', '繳費狀態', '後五碼', '已勾選確認', '提交時間戳']);
            sheet.setFrozenRows(1);
            Logger.log(`已自動建立工作表「${PAYMENT_SHEET_NAME}」並寫入標頭。`);
        }

        // 3. 找學生：若名單中已有此學號 → 更新該列；否則 → 新增一列
        const targetRow = _findStudentRow(sheet, studentId);
        const now = new Date();

        if (targetRow !== -1) {
            Logger.log(`找到既有學號於第 ${targetRow} 列，更新該列。`);
            const existingName = sheet.getRange(targetRow, COL_STUDENT_NAME).getValue();
            if (!existingName) {
                sheet.getRange(targetRow, COL_STUDENT_NAME).setValue(studentName);
            }
            sheet.getRange(targetRow, COL_PAY_STATUS).setValue('已繳費待確認');
            sheet.getRange(targetRow, COL_LAST5).setValue(last5);
            sheet.getRange(targetRow, COL_CONFIRMED).setValue('是');
            sheet.getRange(targetRow, COL_TIMESTAMP).setValue(now);
        } else {
            Logger.log('名單中找不到該學號，append 為新列。');
            sheet.appendRow([studentId, studentName, '已繳費待確認', last5, '是', now]);
        }
        SpreadsheetApp.flush(); // 強制把寫入 commit 出去再釋放 lock

        Logger.log('試算表更新完畢。');

        // 4. 回傳跳轉頁
        return _redirect(REDIRECT_URL);

    } catch (mainError) {
        Logger.log('========= 執行發生嚴重錯誤 =========');
        Logger.log(mainError.stack || mainError.toString());
        try {
            const safeParams = (e && e.parameter) ? _maskSensitive(e.parameter) : null;
            MailApp.sendEmail(
                ADMIN_EMAIL,
                '百川畢業學位袍清潔費系統 - CRITICAL ERROR',
                `學生 ID ${studentId} 發生錯誤：${mainError.toString()}\n\n` +
                `錯誤堆疊:\n${mainError.stack}\n\n` +
                `原始資料（敏感欄位已 mask）:\n${JSON.stringify(safeParams)}`
            );
        } catch (mailErr) {
            Logger.log('連寄送錯誤通知信都失敗：' + mailErr.toString());
        }
        return _plain('系統發生嚴重錯誤，畢代已收到通知。請聯繫畢代並提供此訊息：' + mainError.toString());
    } finally {
        try { lock.releaseLock(); } catch (_) {}
    }
}


/**
 * 提供一個 GET 端點，方便部署後直接打開網址測試是否還活著。
 */
function doGet(e) {
    return _plain('此網址為後端處理端點，請透過表單頁面提交資料。');
}


// ---------- 輔助函式 ----------

function _findStudentRow(sheet, studentId) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return -1;
    const idColumn = sheet.getRange(2, COL_STUDENT_ID, lastRow - 1, 1).getValues();
    for (let i = 0; i < idColumn.length; i++) {
        const cell = idColumn[i][0];
        if (cell !== '' && cell !== null && cell.toString().trim() === studentId) {
            return i + 2; // +2 因為從第 2 列開始算
        }
    }
    return -1;
}

/**
 * 跳轉頁：用 top.location.href 把最外層瀏覽器視窗導走，
 * 避免 GAS 預設 iframe 包裝造成「網址列卡在 script.google.com」。
 */
function _redirect(url) {
    const safeUrl = JSON.stringify(url); // JS-safe quoted literal
    const html = `<!DOCTYPE html>
<html lang="zh-Hant"><head>
<meta charset="UTF-8">
<title>正在重新導向...</title>
<meta http-equiv="refresh" content="2; url=${url}" />
<script>
  (function () {
    try { window.top.location.href = ${safeUrl}; }
    catch (e) { window.location.href = ${safeUrl}; }
  })();
</script>
</head><body>
<p>登記成功！如果頁面沒有自動跳轉，請<a href="${url}" target="_top">點擊這裡</a>。</p>
</body></html>`;
    return HtmlService.createHtmlOutput(html)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function _plain(text) {
    return ContentService.createTextOutput(text);
}

/**
 * 把 last5 在中間 mask 掉（如 12345 → 1***5），用於 log。
 */
function _maskLast5(value) {
    if (!value || value.length < 2) return '*****';
    return value[0] + '*'.repeat(value.length - 2) + value[value.length - 1];
}

/**
 * 對表單參數做 deep-copy 並把敏感欄位（last5）mask 掉，
 * 給 Logger / 錯誤通知信使用。
 */
function _maskSensitive(params) {
    if (!params) return params;
    const out = {};
    Object.keys(params).forEach(function (k) {
        if (k === 'last5') {
            out[k] = _maskLast5(String(params[k] || ''));
        } else {
            out[k] = params[k];
        }
    });
    return out;
}
