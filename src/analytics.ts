// Datadog Real User Monitoring: sessions, clicks, page timing and session replay. Only runs on the live site
// (not while developing), and is loaded after the page so it never slows the first paint.
// The application id and client token are meant to be public; they only let the browser send data to my dashboard.
export function startAnalytics() {
  if (!import.meta.env.PROD) return
  import('@datadog/browser-rum').then(({ datadogRum }) => {
    datadogRum.init({
      applicationId: '67b59fc1-3b26-4249-a788-41da78aa7281',
      clientToken: 'pub8ed6542931906445f29bab2bae07ba88',
      site: 'us5.datadoghq.com',
      service: 'portfolio',
      env: 'prod',
      version: '1.0.0',
      sessionSampleRate: 100,
      sessionReplaySampleRate: 100, // record every visit
      trackResources: true,
      trackUserInteractions: true,
      trackLongTasks: true,
      defaultPrivacyLevel: 'mask-user-input',
    })
  })
}
