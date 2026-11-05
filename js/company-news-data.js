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
