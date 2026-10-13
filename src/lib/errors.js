export function describeReadError(err) {
  if (err?.code === 'permission-denied') return 'You do not have access to this data.'
  if (err?.code === 'unavailable') return 'Network unavailable. Data may be out of date.'
  return 'Data could not be loaded. Please try again.'
}

export function describeWriteError(err) {
  if (err?.code === 'permission-denied') return 'You do not have permission to make this change.'
  if (err?.code === 'unavailable') return 'Network unavailable. Nothing was saved. Try again when you are online.'
  return 'The change could not be saved. Please try again.'
}
