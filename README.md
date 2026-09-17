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
| Close (✕) | `bridge.send("fakeDoorClose", { featureId })` — new, the original page had no close control |
| Bridge | iOS `webkit.messageHandlers.nativeBridge`, Android `window.AndroidBridge`, else `console.log` |
| Analytics | `bridge.sendAnalyticsEvent(name, params)` |
| Native → JS | `window.navigateNext` / `window.navigatePrev` |
| Theme | Same CSS custom properties the real bundle sets at boot |

Copy is inlined rather than loaded from i18n — this is a test page.

## Layout

```
assets/app.js     bridge + content map + renderer
assets/app.css    design tokens and styles
fake-doors/<id>/  one index.html per featureId
404.html          unknown featureId -> error screen
```
