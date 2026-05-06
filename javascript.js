// 表單前端：placeholder 偵測 + 提交前驗證
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('mainForm');
    const submitBtn = document.getElementById('submitBtn');
    const paidCheckbox = document.getElementById('paid');
    const last5 = document.getElementById('last5');

    // 部署前的防呆：如果 form action 還是 placeholder，直接鎖住按鈕，
    // 避免同學送出後看到 google script 的 404 / 英文錯誤頁。
    if (!form.action || form.action.includes('REPLACE_WITH_YOUR_NEW_DEPLOYMENT_ID')) {
        submitBtn.disabled = true;
        submitBtn.textContent = '系統尚未上線，請聯絡畢代';
        const warn = document.createElement('p');
        warn.textContent = '⚠️ 表單後端網址尚未設定（form action 仍是預設 placeholder），請聯絡畢代完成部署。';
        warn.style.color = '#c0392b';
        warn.style.fontWeight = '600';
        warn.style.marginTop = '12px';
        form.appendChild(warn);
        return; // 不再綁 submit handler
    }

    form.addEventListener('submit', (event) => {
        if (!paidCheckbox.checked) {
            alert('請先勾選「我已完成 NT$ 350 學位袍清潔維護費匯款」。');
            event.preventDefault();
            return;
        }
        if (!/^\d{5,6}$/.test(last5.value.trim())) {
            alert('匯款帳號後五碼請輸入 5 或 6 位純數字。');
            event.preventDefault();
            return;
        }
        submitBtn.textContent = '傳送中...';
        submitBtn.disabled = true;
    });
});
