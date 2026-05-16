(function () {
  var params = new URLSearchParams(window.location.search);
  var ref = params.get('ref');
  var url = 'https://www.vocaband.com/';
  if (ref) url += '?ref=' + encodeURIComponent(ref);

  var urlEl = document.getElementById('poster-url');
  if (urlEl) urlEl.textContent = url.replace(/^https?:\/\//, '');

  var printBtn = document.getElementById('print-btn');
  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });

  var target = document.getElementById('qr-target');
  if (!target) return;

  try {
    if (typeof qrcode !== 'function') throw new Error('qrcode-generator not loaded');
    var qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    target.innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
    var svg = target.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.display = 'block';
      svg.querySelectorAll('path, rect').forEach(function (el) {
        var f = el.getAttribute('fill');
        if (f === '#000000' || f === 'black' || !f) el.setAttribute('fill', '#1F2937');
      });
    }
  } catch (e) {
    target.textContent = 'vocaband.com';
    target.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:800;color:#4f46e5;font-size:11pt;text-align:center;';
    console.warn('[poster-schools] QR generation failed:', e);
  }
})();
