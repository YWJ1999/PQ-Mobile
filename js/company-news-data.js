// The Home feed and the news reader use the same announcement IDs and copy.
const COMPANY_NEWS = [
  {
    id: 'town-hall',
    title: 'Town Hall this Friday',
    date: 'Today',
    paragraphs: ['Dear all,', 'Join the leadership team this Friday at 3:00 PM for the quarterly company update on Q3 strategy.'],
    attachments: [{ name: 'Town hall notice', type: 'Text document', href: '../../../assets/news/town-hall-notice.txt' }]
  },
  {
    id: 'industry-award',
    title: 'PeopleQuest wins industry award',
    date: 'Yesterday',
    paragraphs: ['PeopleQuest won Best Enterprise HCM Solution 2026.', 'This award celebrates the team behind the achievement.']
  },
  {
    id: 'mobile-launch',
    title: 'PeopleHCM 3.0 Mobile Launch',
    date: '3 days ago',
    paragraphs: ['PeopleHCM 3.0 brings instant leave approvals and AI insights to the mobile app.']
  }
];

const WORKPLACE_NEWS_STATE_KEY = 'peoplehcm:workplace:news:v1';

function readWorkplaceNewsState(records) {
  try {
    const saved = JSON.parse(localStorage.getItem(WORKPLACE_NEWS_STATE_KEY) || '{}');
    const state = {};
    for (const record of records) {
      const row = saved?.[record.id];
      if (!row || typeof row !== 'object') continue;
      const acknowledgedAt = typeof row.acknowledgedAt === 'string' && Number.isFinite(Date.parse(row.acknowledgedAt))
        ? row.acknowledgedAt : null;
      state[record.id] = {
        read: row.read === true || row.bookmarked === true || Boolean(acknowledgedAt) || Boolean(row.feedback),
        bookmarked: row.bookmarked === true,
        acknowledgedAt,
        feedback: typeof row.feedback === 'string' ? row.feedback.slice(0, 1000) : ''
      };
    }
    return state;
  } catch { return {}; }
}
