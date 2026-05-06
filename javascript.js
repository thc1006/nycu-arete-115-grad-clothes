// 表單提交前檢查：確認「已繳費」勾選框已勾、後五碼為純數字
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('mainForm');
    const submitBtn = document.getElementById('submitBtn');
    const paidCheckbox = document.getElementById('paid');
    const last5 = document.getElementById('last5');

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
