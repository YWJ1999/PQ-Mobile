// Keep saved links to the old Workplace document page working.
(() => {
  const params = new URLSearchParams(location.search);
  const documentId = params.get('document');
  const ref = documentId === 'check-title' ? 'DE001' : documentId;
  if (Object.hasOwn(POLICY_DATABASE, ref)) {
    const target = workplacePolicyDetailsUrl(ref);
    target.searchParams.set('theme', params.get('theme') || getCurrentTheme());
    if (POLICY_DATABASE[ref].policy?.pdfUrl) target.searchParams.set('pdf', 'policy');
    location.replace(target.href);
    return;
  }
  const back = new URL('policy-sop.html', location.href);
  back.search = location.search;
  back.searchParams.delete('document');
  document.getElementById('policyDocumentBack').href = back.href;
  document.getElementById('policyDocumentUnavailable').hidden = false;
})();
