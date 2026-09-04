(function () {
'use strict';
document.addEventListener('keydown', function (e) {
if (e.ctrlKey || e.metaKey || e.altKey) return;
var t = e.target;
if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
if (e.key === 't' || e.key === 'T') {
var btn = document.getElementById('theme-toggle');
if (btn) btn.click();
}
});
})();