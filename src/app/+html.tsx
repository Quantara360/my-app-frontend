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

        {/* Expo Router renders <title>/<meta name="description"> per-route via
            its own head manager (the empty `data-rh="true"` tag it leaves
            here client-side), but that only exists after the JS bundle runs.
            The static fallback below is what an automated crawler, a search
            engine, or a manual reviewer at a security/web-filtering vendor
            (FortiGuard, Cisco Umbrella, Zscaler, etc.) actually sees when
            they fetch the bare URL without executing JS - previously this
            was a blank <title></title> with no description, which is a
            common reason those vendors leave a brand-new domain sitting at
            "Not Rated" / "Uncategorized" indefinitely, and some corporate
            firewalls block unrated sites by default. Giving crawlers real
            text to read makes automatic/manual categorization far more
            likely to actually happen. */}
        <title>Abeysone – Workforce Attendance &amp; HR Management</title>
        <meta
          name="description"
          content="Abeysone is a workforce attendance and HR management platform for tracking employee attendance via face recognition, payroll, worksite operations, bonds, and financial records."
        />

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

        {/* ScrollViewStyleReset above sets #root/body/html to height:100%.
            On mobile browsers, % height resolves against the *initial*
            viewport (address bar visible) and does not update as the
            address bar auto-hides while scrolling/interacting, leaving a
            gap the size of the address bar unstyled/blank at the bottom -
            reported as "background only covers half the screen".

            First attempt here used 100dvh (dynamic viewport height), which
            is supposed to continuously track the visible viewport as browser
            chrome shows/hides - but that requires the browser to reflow the
            whole layout live as the toolbar animates, and real mobile Chrome
            has known inconsistency in when/whether that reflow actually
            fires (this did not reproduce in headless-browser testing, which
            uses a desktop rendering engine and doesn't have a real
            collapsing toolbar to expose the bug - only real device testing
            caught it still failing).

            100svh (small viewport height) sidesteps that entirely: it's a
            static floor equal to the guaranteed-smallest visible viewport
            (chrome fully expanded), so there's no reflow to depend on - the
            page is correctly sized from first paint and never needs to
            react to a toolbar animation. Trades away reclaiming the extra
            space when the toolbar happens to be hidden, which is a minor
            cosmetic loss next to not having a broken-looking gap. */}
        <style dangerouslySetInnerHTML={{ __html: `
          @supports (height: 100svh) {
            #root, body, html { height: 100svh; }
          }
          #root, body, html { height: var(--app-height, 100svh); }
        ` }} />

        {/* Belt-and-suspenders on top of the CSS unit above: two rounds of
            viewport-unit fixes (100dvh, then 100svh) each looked correct in
            testing but the reporter's real device still showed the gap -
            CSS viewport units have a long history of cross-browser/cross-
            version inconsistency that's hard to fully account for from here.
            This measures the ACTUAL visible height via JS
            (window.visualViewport, which is what a real mobile browser uses
            internally to track keyboard/toolbar changes) and applies it as
            a plain pixel value via a CSS custom property, re-measuring on
            every resize/orientation change. This is independent of whichever
            viewport-unit keyword a given browser version does or doesn't
            support correctly - it reads the same number the browser itself
            is tracking, rather than asking the browser to compute it again
            via a CSS unit. 100svh above is the pre-JS/no-JS fallback only. */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                function setAppHeight() {
                  var h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
                  document.documentElement.style.setProperty('--app-height', h + 'px');
                }
                setAppHeight();
                window.addEventListener('resize', setAppHeight);
                window.addEventListener('orientationchange', setAppHeight);
                if (window.visualViewport) {
                  window.visualViewport.addEventListener('resize', setAppHeight);
                }
              })();
            `,
          }}
        />

        {/* The actual cause of the gap-after-scrolling bug (confirmed by
            before/after-scroll screenshots showing no gap on first paint,
            one appearing only once scrolled - including inside the
            installed PWA, which has no address bar at all, ruling out the
            viewport-unit fix above for this specific case): every
            ScrollView across the app was passed bounces={false} and
            overScrollMode="never" in an earlier fix, intending to stop
            rubber-band/overscroll from revealing space beyond the actual
            content. Those are React Native NATIVE-ONLY props - grep across
            react-native-web's ScrollView source confirms it does not read
            either one, so on web (the platform actually being tested here)
            that fix silently did nothing. The overscrolled region is
            outside the ScrollView's own rendered content, so none of the
            background-color fixes from other rounds could ever cover it
            either - it falls through to the page's default background.

            The real web equivalent is the CSS property
            overscroll-behavior. react-native-web assigns every vertical
            ScrollView's outer div the same reused atomic class for its
            overflow-y:auto rule (r-1rnoaur as of the current
            react-native-web version - verified present across every
            screen's build output). Overriding that one class stops
            overscroll on every ScrollView in the app at once, with
            html/body containment as a second layer of defense.

            Reset confirmed the reporter tested a fresh reinstall of this
            exact fix and the gap was still there - overscroll-behavior:
            contain on the ScrollView's own class was the bug. `contain`
            only stops the overscroll from chaining to ancestor scroll
            containers; it does NOT suppress the local rubber-band/glow
            effect on the element itself, which is exactly the visual
            artifact this needs to kill. `none` disables both. */}
        <style dangerouslySetInnerHTML={{ __html: `
          html, body { overscroll-behavior: none; }
          .r-1rnoaur { overscroll-behavior: none; }
        ` }} />

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
                // Browsers replace the real error with the generic string
                // "Script error." (no message/stack) when they treat the
                // failing script as cross-origin - this happens even for our
                // own same-origin code if it ran inside a dynamically
                // injected chunk (code-splitting) rather than a plain
                // top-level <script> tag. When that happens e.message is
                // just "Script error." with filename/lineno/colno all blank
                // too, so there's nothing more to extract - but capturing
                // those fields whenever they ARE available (the common case)
                // turns "Script error." into an actual file+line we can look
                // up instead of a dead end.
                window.addEventListener('error', function (e) {
                  var parts = [(e && (e.message || (e.error && e.error.toString()))) || 'Unknown error'];
                  if (e && e.filename) parts.push('at ' + e.filename + ':' + e.lineno + ':' + e.colno);
                  if (e && e.error && e.error.stack) parts.push(String(e.error.stack));
                  showFatalError(parts.join('\\n'));
                });
                window.addEventListener('unhandledrejection', function (e) {
                  var reason = e && e.reason;
                  var msg = 'Unhandled promise rejection: ' + (reason && reason.toString ? reason.toString() : String(reason));
                  if (reason && reason.stack) msg += '\\n' + String(reason.stack);
                  showFatalError(msg);
                });
              })();
            `,
          }}
        />

        {/* TEMPORARY diagnostic overlay for the persistent white-gap-below-
            content bug - five fixes across five rounds (cache headers, dvh,
            svh, overscroll-behavior, JS-measured height) have each looked
            right from here but the reporter's real device still shows the
            gap. Rather than guess a sixth blind fix, show the actual
            measured numbers directly on screen so a single screenshot from
            the reporter gives real data instead of another visual-only
            report. Remove once the bug is confirmed fixed. */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                function findScroller() {
                  var all = document.querySelectorAll('*');
                  var matches = [];
                  for (var i = 0; i < all.length; i++) {
                    var el = all[i];
                    if (el === document.documentElement || el === document.body) continue;
                    if (el.scrollHeight > el.clientHeight + 2) {
                      var cs = getComputedStyle(el);
                      if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') matches.push(el);
                    }
                  }
                  return matches;
                }
                function update() {
                  var box = document.getElementById('diag-overlay');
                  if (!box) {
                    box = document.createElement('div');
                    box.id = 'diag-overlay';
                    box.style.cssText = 'position:fixed;top:0;left:0;z-index:999998;'
                      + 'background:rgba(0,0,0,0.75);color:#0f0;padding:6px 8px;'
                      + 'font:10px/1.4 monospace;white-space:pre;pointer-events:none;';
                    document.body.appendChild(box);
                  }
                  var vv = window.visualViewport;
                  var appHeight = getComputedStyle(document.documentElement).getPropertyValue('--app-height');
                  var root = document.getElementById('root');
                  var scrollers = findScroller();
                  var lines = [
                    'innerHeight=' + window.innerHeight,
                    'visualViewport.height=' + (vv ? vv.height : 'n/a'),
                    '--app-height=' + (appHeight || 'unset'),
                    'html.clientHeight=' + document.documentElement.clientHeight,
                    'html overscroll-behavior=' + getComputedStyle(document.documentElement).overscrollBehavior,
                    'body.scrollHeight=' + document.body.scrollHeight,
                    'body overscroll-behavior=' + getComputedStyle(document.body).overscrollBehavior,
                    'root.rect.height=' + (root ? Math.round(root.getBoundingClientRect().height) : 'n/a'),
                    'bodyBg=' + getComputedStyle(document.body).backgroundColor,
                    'scrollers found=' + scrollers.length,
                  ];
                  scrollers.slice(0, 4).forEach(function (scroller, idx) {
                    var scs = getComputedStyle(scroller);
                    var srect = scroller.getBoundingClientRect();
                    lines.push('[' + idx + '] ' + scroller.tagName + '#' + (scroller.id || '-') + '.' + (scroller.className || '-').toString().slice(0, 25));
                    lines.push('    scrollTop/scrollH/clientH=' + scroller.scrollTop + '/' + scroller.scrollHeight + '/' + scroller.clientHeight);
                    lines.push('    overscroll-behavior=' + scs.overscrollBehavior + ' bg=' + scs.backgroundColor);
                    lines.push('    rect.top/bottom=' + Math.round(srect.top) + '/' + Math.round(srect.bottom));
                  });
                  if (scrollers.length === 0) {
                    lines.push('scroller=NOT FOUND');
                  }
                  box.textContent = lines.join('\\n');
                }
                function start() {
                  update();
                  window.addEventListener('resize', update);
                  window.addEventListener('scroll', update, true);
                  setInterval(update, 500);
                }
                // This script runs while the browser is still parsing <head>,
                // before <body> exists yet - calling update() (which touches
                // document.body) synchronously here throws immediately and
                // silently kills the rest of this IIFE, including the event
                // listeners below it. That was the actual bug in the first
                // version of this overlay (it never appeared at all, on any
                // device, because it errored out on its own first line).
                if (document.body) {
                  start();
                } else {
                  document.addEventListener('DOMContentLoaded', start);
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        {/* Same reasoning as the <title>/<meta description> above: real,
            visible text for anything that reads the page without running
            JS. Hidden the instant React mounts. */}
        <noscript>
          <div style={{ fontFamily: '-apple-system, sans-serif', padding: 40, maxWidth: 600, margin: '0 auto' }}>
            <h1>Abeysone</h1>
            <p>
              Abeysone is a workforce attendance and HR management platform used to track employee
              attendance, payroll, worksite operations, bonds, and financial records. Please enable
              JavaScript to use the app.
            </p>
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
