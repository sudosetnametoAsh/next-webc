/** Dropbox stores both the online marker (pending) and submitted file data.
 * Review status and audit history do not determine the officer's selected mode.
 */
export function isOnlineSubmission(dropbox: string | null | undefined) {
  const value = dropbox?.trim().toLowerCase();
  return Boolean(value && value !== 'null' && value !== 'undefined');
}
