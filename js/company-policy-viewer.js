async function showCompanyPolicyPdf(file) {
  const viewer = document.getElementById('companyPdfViewer');
  const status = document.getElementById('pdfStatus');
  document.getElementById('pdfFilename').textContent = file?.name || 'Document unavailable';
  document.title = (file?.name || 'PDF viewer') + ' · PeopleHCM';
  viewer.hidden = false;
  if (!file?.pdfUrl) {
    status.textContent = 'This PDF is unavailable.';
    return;
  }

  // Local file previews cannot load JavaScript modules or workers in many browsers.
  if (location.protocol === 'file:') {
    const frame = document.getElementById('pdfNativeReader');
    frame.title = file.name;
    frame.src = file.pdfUrl + '#view=FitH';
    frame.hidden = false;
    status.hidden = true;
    return;
  }

  const area = document.getElementById('pdfPageArea');
  const canvas = document.getElementById('pdfPage');
  const controls = document.getElementById('pdfControls');
  const previous = document.getElementById('pdfPrevious');
  const next = document.getElementById('pdfNext');
  const zoom = document.getElementById('pdfZoom');
  status.textContent = 'Opening PDF…';
  try {
    const pdfjs = await import('../assets/vendor/pdfjs-5.6.205/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('assets/vendor/pdfjs-5.6.205/pdf.worker.min.mjs', document.baseURI).href;
    const pdf = await pdfjs.getDocument({ url: file.pdfUrl, isEvalSupported: false }).promise;
    let pageNumber = 1;
    let zoomed = false;
    area.hidden = controls.hidden = false;

    async function renderPage() {
      previous.disabled = next.disabled = zoom.disabled = true;
      try {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const width = area.clientWidth * (zoomed ? 1.75 : 1);
        const scaled = page.getViewport({ scale: width * ratio / viewport.width });
        canvas.width = Math.ceil(scaled.width);
        canvas.height = Math.ceil(scaled.height);
        canvas.style.width = zoomed ? '175%' : '100%';
        await page.render({ canvas, viewport: scaled }).promise;
        const position = 'Page ' + pageNumber + ' of ' + pdf.numPages;
        canvas.setAttribute('aria-label', file.name + ', ' + position);
        document.getElementById('pdfPosition').textContent = position;
        zoom.textContent = zoomed ? 'Fit width' : 'Zoom in';
        zoom.setAttribute('aria-pressed', String(zoomed));
        area.scrollTo(0, 0);
        previous.disabled = pageNumber === 1;
        next.disabled = pageNumber === pdf.numPages;
        zoom.disabled = false;
        status.hidden = true;
      } catch {
        showError();
      }
    }

    previous.onclick = () => { pageNumber--; renderPage(); };
    next.onclick = () => { pageNumber++; renderPage(); };
    zoom.onclick = () => { zoomed = !zoomed; renderPage(); };
    await renderPage();
  } catch {
    showError();
  }

  function showError() {
    area.hidden = controls.hidden = true;
    status.hidden = false;
    status.textContent = 'Unable to open this PDF. Return to the document and try again.';
  }
}
