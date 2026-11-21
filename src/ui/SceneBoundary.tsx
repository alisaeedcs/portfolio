import { Component, type ReactNode } from 'react'

// Keeps a problem in a 3D scene from taking the whole page down with it. If a scene fails, it just doesn't show.
// If it failed because this tab is running an old version of the site (the files it wants were replaced by a newer
// deploy), it reloads once to pick up the new version.
const STALE = /dynamically imported module|importing a module script|loading chunk|failed to fetch/i

export default class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    if (!STALE.test(error?.message ?? '')) return
    try {
      if (sessionStorage.getItem('reloaded-for-update')) return
      sessionStorage.setItem('reloaded-for-update', '1')
    } catch {
      /* storage blocked: reload anyway, once per page load is enough */
    }
    window.location.reload()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
