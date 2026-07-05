export const visitStatus = Object.freeze({
  scheduled: 'Scheduled',
  checkedIn: 'Checked in',
  needsVitals: 'Needs vitals',
  doctorReview: 'Doctor review',
  completed: 'Completed',
  cancelled: 'Cancelled',
});

export const visitStatuses = Object.freeze(Object.values(visitStatus));
