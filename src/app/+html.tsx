import { ScrollViewStyleReset } from 'expo-router/html';

// Root HTML document for the web export (expo-router picks this up
// automatically at build time - see https://docs.expo.dev/router/reference/static-rendering/#root-html).
//
// Why this file exists: on iOS Safari and some older Android browsers, a
// crash that happens outside React's render phase (an async error in a
// useEffect, an unhandled promise rejection, or a runtime error while the
// bundle is still evaluating) is NOT caught by our React <ErrorBoundary/>
// (src/components/error-boundary.tsx) - React error boundaries only catch
// synchronous errors thrown during render. Without this, those crashes
// produce a silent blank/white screen with the only trace being a console
// message nobody in the field can see. The inline script below installs a
// plain-JS safety net that runs before the RN bundle finishes loading and
// shows a visible, screenshot-able error banner instead of a blank screen -
// so the next time this happens we get an actual error message instead of
// "it doesn't work".
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        {/* iOS: run as a standalone app when added to the home screen, and
            match the app's dark theme in the status bar / task switcher
            instead of Safari's default white chrome. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Abeysone" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/logo192.png" />
        <link rel="manifest" href="/manifest.json" />

        <ScrollViewStyleReset />

        {/* Must be inline (not an imported bundle) so it still runs even if
            the main RN bundle fails to load or throws while evaluating. */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                function showFatalError(message) {
                  if (document.getElementById('fatal-error-banner')) return;
                  var el = document.createElement('div');
                  el.id = 'fatal-error-banner';
                  el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;'
                    + 'background:#b00020;color:#fff;padding:16px;font:13px/1.4 -apple-system,sans-serif;'
                    + 'max-height:60vh;overflow:auto;white-space:pre-wrap;word-break:break-word;';
                  el.textContent = 'App failed to load. Please screenshot this and send it to support:\\n\\n' + message;
                  document.body.appendChild(el);
                }
                window.addEventListener('error', function (e) {
                  showFatalError((e && (e.message || (e.error && e.error.toString()))) || 'Unknown error');
                });
                window.addEventListener('unhandledrejection', function (e) {
                  var reason = e && e.reason;
                  showFatalError('Unhandled promise rejection: ' + (reason && reason.toString ? reason.toString() : String(reason)));
                });
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
