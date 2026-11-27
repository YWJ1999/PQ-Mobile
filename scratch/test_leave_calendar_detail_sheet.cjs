const checkCalendar = require('./test_leave_individual_calendar_detail.cjs');

checkCalendar('view=my-calendar', 'myPersonalCalDaysGrid', 'myPersonalCalEventDetail').catch(error => {
  console.error(error);
  process.exitCode = 1;
});
