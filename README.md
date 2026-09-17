# mb-fake-door-webview

Static rebuild of the Muscle Booster fake-door web view, using the Figma
`01 - web full` design, for testing in the app's WebView.

It keeps the contract of the real page on
`user-portal-muscle-booster-web-views-stage.asqq.io`:

| Piece | Behaviour |
|---|---|
| Route | `/fake-doors/<featureId>` — `nutrition`, `fitness` (`stretching` aliases to `fitness`); `?featureId=` also works |
| Unknown id | Error screen with a retry button |
| CTA | `bridge.send("fakeDoorCTAclick", { featureId })` |
| Bridge | iOS `webkit.messageHandlers.nativeBridge`, Android `window.AndroidBridge`, else `console.log` |
| Analytics | `bridge.sendAnalyticsEvent(name, params)` |
| Native → JS | `window.navigateNext` / `window.navigatePrev`, `window.setSafeAreaInsets({top,right,bottom,left})` |
| Theme | Same CSS custom properties the real bundle sets at boot |

Copy is inlined rather than loaded from i18n — this is a test page.
The close control is native chrome, so the page never draws one; the layout
leaves a 56px band under the status bar for it.

## Safe area

The background (page colour and the blurred blue glows) is full-bleed; everything
else sits inside `env(safe-area-inset-*)`. Those resolve inside the app's
`WKWebView` because the page ships `viewport-fit=cover` and `WebView.swift` sets
`scrollView.contentInsetAdjustmentBehavior = .never` — the two together are what
hand safe-area handling to CSS. No native change is needed on iOS.
`window.setSafeAreaInsets()` exists only as an override for platforms that report
nothing (older Android WebViews).

## Layout

```
assets/app.js     bridge + content map + renderer
assets/app.css    design tokens and styles
fake-doors/<id>/  one index.html per featureId
404.html          unknown featureId -> error screen
```
