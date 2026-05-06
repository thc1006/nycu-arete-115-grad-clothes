# nycu-arete-115-grad-clothes

百川學程 115 級｜畢業學位袍清潔維護費繳費登記表單。

> Repo：https://github.com/thc1006/nycu-arete-115-grad-clothes
> Pages：https://thc1006.github.io/nycu-arete-115-grad-clothes/

## 功能
- 同學填寫學號、姓名、勾選「已完成 NT$ 350 匯款」、輸入匯款帳號後五碼。
- 表單送出後寫入 Google Sheet「繳費登記」分頁，並導向 `thank-you.html` 顯示領袍時間／地點。

## 學位袍領取
- 日期：2026 年 5 月 11 日（星期一）
- 時段：12:00
- 地點：綜合一館 509（系窩）

## 檔案
| 檔案 | 用途 |
|---|---|
| `index.html` | 主表單頁 |
| `javascript.js` | 前端驗證 |
| `styles.css` | 樣式 |
| `thank-you.html` | 提交完成頁（提醒領袍時間／地點） |
| `gas/Code.gs` | Google Apps Script 後端 |

## 部署 Google Apps Script

詳細逐步教學請見對話紀錄；簡述：
1. 建立 Google Sheet → 複製 ID（網址 `/d/<ID>/edit`）。
2. Apps Script → 把 `gas/Code.gs` 內容貼進去 → 把檔案內 `SPREADSHEET_ID` 換成上一步的 ID。
3. 部署 → 新增部署 → 類型「網路應用程式」→ 執行身分「我」→ 存取權「所有人」→ 取得 `/exec` 結尾的網址。
4. 把該網址貼到 `index.html` 中 `form action="..."`。
5. （可選）GitHub Pages 啟用後即可分享 `index.html` 給同學。
