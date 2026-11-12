// Both Home themes use the same preview schedule and dashboard layout.
(() => {
  const home = document.querySelector('.home-overview');
  const schedule = {
    shift: { from: '09:00', to: '18:00' },
    training: { date: '2026-10-20', from: '09:00', to: '17:00' },
    otPlan: { from: '18:00', to: '20:00', hours: 2 }
  };
  const timeRange = entry => `${entry.from}–${entry.to}`;
  const chevron = '<span class="update-chevron" aria-hidden="true"></span>';

  function requestAction(status, label, description) {
    return `<button type="button" class="home-request-action" data-pending-status="${status}"
        onclick="openForYouModal('${status}')" aria-haspopup="dialog" aria-controls="forYouOverlay">
      <strong class="home-request-count" data-home-count="${status}"></strong>
      <span class="fy-text"><span class="fy-title">${label}</span><span class="fy-description">${description}</span></span>
      ${chevron}
    </button>`;
  }

  function insightPane(scope) {
    const team = scope === 'team';
    function trendButton(trend, label, icon) {
      return `<button type="button" class="home-insight-change" data-trend="${trend}"
          onclick="openInsightBreakdown('${scope}', 'all', '${trend}')" aria-haspopup="dialog" aria-controls="indicatorsOverlay">
        <i class="fa-solid ${icon}" aria-hidden="true"></i>
        <span><strong class="insight-trend-count"></strong> ${label}</span>${chevron}
      </button>`;
    }
    return `<div class="insight-tab-pane${team ? '' : ' active'}" id="${team ? 'paneTeam' : 'paneMy'}"
        data-insight-scope="${scope}" role="region" aria-label="${team ? 'Team' : 'My'} insights"${team ? ' hidden' : ''}>
      <div class="insight-metrics-grid">
        ${trendButton('improved', 'improved', 'fa-arrow-trend-up')}
        ${trendButton('worsened', 'worsened', 'fa-arrow-trend-down')}
      </div>
      <div class="home-insight-footer">
        <div class="home-metric-summary">
          <button type="button" data-trend="unchanged" onclick="openInsightBreakdown('${scope}', 'all', 'unchanged')"
              aria-haspopup="dialog" aria-controls="indicatorsOverlay"><span class="insight-trend-count"></span> unchanged</button>
          <span aria-hidden="true">·</span><span data-insight-total></span>
        </div>
        <button type="button" class="section-action" onclick="openInsightBreakdown('${scope}', 'all')"
            aria-haspopup="dialog" aria-controls="indicatorsOverlay">View details ${chevron}</button>
      </div>
    </div>`;
  }

  home.innerHTML = `
    <a class="for-you-card for-you-reminder home-shift" data-reminder-type="clocking"
        aria-label="Today’s shift, ${timeRange(schedule.shift)}. Open Clocking">
      <span class="fy-left">
        <span class="fy-avatar"><i class="fa-solid fa-clock" aria-hidden="true"></i></span>
        <span class="fy-text"><span class="home-shift-label">Today's Shift</span><strong class="home-shift-time">${timeRange(schedule.shift)}</strong></span>
      </span>${chevron}
    </a>

    <section aria-labelledby="homeActionsTitle">
      <div class="section-header"><h2 class="section-title" id="homeActionsTitle">Action Required</h2></div>
      <div class="home-request-grid">
        ${requestAction('pending_approval', 'To approve', 'Team requests')}
        ${requestAction('pending_resubmit', 'To update', 'My requests')}
      </div>
    </section>

    <section aria-labelledby="homeTodayTitle">
      <div class="section-header"><h2 class="section-title" id="homeTodayTitle">Today</h2></div>
      <div class="home-schedule-list">
        <button type="button" class="home-schedule-row" data-reminder-type="training"
            data-training-date="${schedule.training.date}" aria-haspopup="dialog" aria-controls="trainingCalendarSheet">
          <span class="fy-left">
            <span class="fy-avatar"><i class="fa-solid fa-graduation-cap" aria-hidden="true"></i></span>
            <span class="fy-text"><span class="fy-title">Training</span><span class="fy-description">${timeRange(schedule.training)}</span></span>
          </span>${chevron}
        </button>
        <article class="home-schedule-row" data-reminder-type="ot-plan">
          <span class="fy-left">
            <span class="fy-avatar"><i class="fa-solid fa-business-time" aria-hidden="true"></i></span>
            <span class="fy-text"><span class="fy-title">Planned OT</span><span class="fy-description">${timeRange(schedule.otPlan)} · ${schedule.otPlan.hours} ${schedule.otPlan.hours === 1 ? 'hour' : 'hours'}</span></span>
          </span>
        </article>
      </div>
    </section>

    <section class="insights-card" aria-labelledby="insightCardTitle">
      <div class="insights-header">
        <h2 class="insights-title" id="insightCardTitle">My Insights</h2>
        <div class="insights-pills" role="group" aria-label="Insights scope">
          <button type="button" class="insight-pill active" id="pillMy" aria-pressed="true" aria-controls="paneMy" onclick="switchInsightTab('my')">My</button>
          <button type="button" class="insight-pill" id="pillTeam" aria-pressed="false" aria-controls="paneTeam" onclick="switchInsightTab('team')">Team</button>
        </div>
      </div>
      ${insightPane('my')}
      ${insightPane('team')}
    </section>`;

  // Build the destination after the app applies the theme from the URL.
  document.addEventListener('DOMContentLoaded', () => {
    home.querySelector('.home-shift').href = APP_ROUTES.clocking();
  }, { once: true });
})();
