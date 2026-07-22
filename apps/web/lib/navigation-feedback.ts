export const NAVIGATION_START_EVENT = 'cuweave:navigation-start'

export function startNavigationFeedback() {
  window.dispatchEvent(new Event(NAVIGATION_START_EVENT))
}
