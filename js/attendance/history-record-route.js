window.addEventListener('DOMContentLoaded', () => {
  const views = {
    clocking: ['clockDetailsModal', renderClockHistoryDetail],
    ot: ['otDetailsModal', renderOtHistoryDetail],
    feedback: ['feedbackDetailsModal', renderFeedbackHistoryDetail]
  };
  HistoryRecordPage.register((kind, id) => {
    if (!Object.hasOwn(views, kind) || !Object.hasOwn(attendanceHistoryFields[kind], id)) return;
    const [pageId, render] = views[kind];
    const tab = document.getElementById('tab' + kind[0].toUpperCase() + kind.slice(1));
    if (!tab.classList.contains('active')) switchMainTab(kind);
    render(id, ...attendanceHistoryFields[kind][id]);
    return document.getElementById(pageId);
  });
});
