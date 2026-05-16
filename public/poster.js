(function () {
  var params = new URLSearchParams(window.location.search);
  var ref = params.get('ref');
  var classCode = params.get('class');
  var url = 'https://www.vocaband.com/student';
  var qs = [];
  if (classCode) qs.push('class=' + encodeURIComponent(classCode));
  if (ref)       qs.push('ref=' + encodeURIComponent(ref));
  if (qs.length) url += '?' + qs.join('&');

  var urlEl = document.getElementById('poster-url');
  if (urlEl) urlEl.textContent = url.replace(/^https?:\/\//, '');
  if (classCode) document.title = 'Vocaband poster — class ' + classCode;

  // Class-code banner is `hidden` by default — only reveal when a
  // class code is present so the generic /poster page doesn't show a
  // confusing empty banner.
  var codeBanner = document.getElementById('code-banner');
  var codeValueEl = document.getElementById('code-value');
  if (codeBanner && codeValueEl && classCode) {
    codeValueEl.textContent = classCode.toUpperCase();
    codeBanner.hidden = false;
  }

  var printBtn = document.getElementById('print-btn');
  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });

  var target = document.getElementById('qr-target');
  if (!target) return;

  try {
    if (typeof qrcode !== 'function') throw new Error('qrcode-generator not loaded');
    var qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    target.innerHTML = qr.createSvgTag({
      cellSize: 8,
      margin: 2,
      scalable: true,
    });
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
    target.textContent = 'Type the link →';
    target.style.cssText = 'width:100mm;height:100mm;border:1px dashed #9ca3af;border-radius:3mm;display:flex;align-items:center;justify-content:center;color:#374151;font-weight:700;font-size:14pt;text-align:center;padding:6mm;flex-shrink:0;';
    console.warn('[poster] QR generation failed:', e);
  }
})();
