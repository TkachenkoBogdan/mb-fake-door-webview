/*
 * Fake door offer page — static rebuild of /fake-doors/:featureId using the
 * "01 web full" design, keeping the contract of the real web-views bundle:
 *
 *   route      /fake-doors/<featureId>          (also accepts ?featureId=)
 *   content    looked up by featureId, unknown id -> error screen
 *   CTA        bridge.send('fakeDoorCTAclick', { featureId })
 *
 * The close control is native chrome, so the page never draws one.
 *   analytics  bridge.sendAnalyticsEvent(name, params)
 *   native in  window.navigateNext / window.navigatePrev
 */

(function () {
    'use strict';

    // --- native bridge -----------------------------------------------------

    function detectPlatform() {
        if (window.AndroidBridge) return 'android';
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeBridge) return 'ios';
        return 'unknown';
    }

    var handlers = new Map();

    function emit(event, payload) {
        var set = handlers.get(event);
        if (!set || set.size === 0) {
            console.warn('[Bridge] Native event "' + event + '" received but no JS handler is subscribed.');
            return;
        }
        Array.from(set).forEach(function (handler) {
            handler(payload);
        });
    }

    window.navigateNext = function () {
        emit('navigateNext', undefined);
    };
    window.navigatePrev = function () {
        emit('navigatePrev', undefined);
    };

    var bridge = {
        platform: detectPlatform(),

        on: function (event, handler) {
            var set = handlers.get(event) || new Set();
            handlers.set(event, set);
            set.add(handler);
            return function () {
                set.delete(handler);
            };
        },

        off: function (event, handler) {
            var set = handlers.get(event);
            if (set) set.delete(handler);
        },

        send: function (method, params) {
            params = params || {};
            if (window.AndroidBridge && typeof window.AndroidBridge[method] === 'function') {
                window.AndroidBridge[method](JSON.stringify(params));
            } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeBridge) {
                window.webkit.messageHandlers.nativeBridge.postMessage({ method: method, params: params });
            } else {
                console.log('[Bridge] ' + method, params);
            }
        },

        sendAnalyticsEvent: function (eventName, params) {
            params = params || {};
            if (window.AndroidBridge) {
                window.AndroidBridge.sendAnalyticsEvent(eventName, JSON.stringify(params));
            } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeBridge) {
                window.webkit.messageHandlers.nativeBridge.postMessage({
                    method: 'sendAnalyticsEvent',
                    eventName: eventName,
                    params: params
                });
            } else {
                console.log('[Bridge] sendAnalyticsEvent ' + eventName, params);
            }
        }
    };

    window.fakeDoorBridge = bridge;

    var CTA_EVENT = 'fakeDoorCTAclick';

    // --- content -----------------------------------------------------------

    var CLOSING = {
        title: 'Want to try this?',
        subtitle: "This experience isn't built yet — tell us you're interested and we'll notify you first."
    };

    var CONTENT = {
        nutrition: {
            images: ['nutrition-b.png', 'nutrition-a.png'],
            title: 'Get a nutrition plan built for your goal',
            description: 'Personalized meals, clear targets, and a plan that actually fits your life.',
            button: 'Notify me',
            valueTitle: "What you'd get",
            values: [
                ['Personalized meal structure', 'Built for your goal, not average'],
                ['Daily guided meals', 'Know what to eat, and when'],
                ['Nutrition tracking', "See how you're doing, day by day"],
                ['Clear calorie & macro targets', 'Numbers that match your goal'],
                ['Adapted to your lifestyle', 'Fits how you already eat']
            ],
            stepsTitle: 'How it would work',
            steps: [
                'Tell us your goal and eating habits',
                'Get a daily meal plan built for you',
                'Track your meals and adjust as you go'
            ],
            closing: CLOSING
        },

        fitness: {
            images: ['fitness-b.png', 'fitness-a.png'],
            title: 'Get your first split before New Year',
            description: "A guided flexibility journey built around your goal — see if it's the right challenge for you.",
            button: 'Notify me',
            valueTitle: "What you'd get",
            values: [
                ['Structured progression', 'A clear path, not guesswork'],
                ['Guided flexibility sessions', 'Step-by-step, every day'],
                ['Progress tracking', 'See how close you are'],
                ['Clear goal and timeframe', 'One goal, one deadline: New Year'],
                ['Adapted to your level', 'Starts where you are now']
            ],
            stepsTitle: 'How it would work',
            steps: [
                "Tell us where you're starting from",
                'Follow your daily guided sessions',
                'Track your progress to full split'
            ],
            closing: CLOSING
        }
    };

    // The design calls the second flow "stretching"; the app sends "fitness".
    var ALIASES = { stretching: 'fitness', flexibility: 'fitness' };

    var ERROR_COPY = {
        title: 'Something went wrong',
        message: "We couldn't load this page. Please try again.",
        retry: 'Try again'
    };

    // --- helpers -----------------------------------------------------------

    function resolveFeatureId() {
        var explicit = new URLSearchParams(window.location.search).get('featureId');
        if (explicit) return explicit;

        var fromBody = document.body.getAttribute('data-feature-id');
        if (fromBody) return fromBody;

        var segments = window.location.pathname.split('/').filter(Boolean);
        var index = segments.lastIndexOf('fake-doors');
        if (index !== -1 && segments[index + 1]) return segments[index + 1];

        return null;
    }

    function assetBase() {
        var script = document.currentScript || document.querySelector('script[src$="app.js"]');
        return script ? script.src.replace(/app\.js.*$/, '') : 'assets/';
    }

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    // --- rendering ---------------------------------------------------------

    function renderError(root) {
        var main = el('main', 'error');
        main.appendChild(el('h1', null, ERROR_COPY.title));
        main.appendChild(el('p', 'error__message', ERROR_COPY.message));

        var retry = el('button', 'cta', ERROR_COPY.retry);
        retry.type = 'button';
        retry.addEventListener('click', function () {
            window.location.reload();
        });
        main.appendChild(retry);

        root.appendChild(main);
    }

    function renderCta(content, featureId) {
        var button = el('button', 'cta', content.button);
        button.type = 'button';
        button.addEventListener('click', function () {
            bridge.send(CTA_EVENT, { featureId: featureId });
        });
        return button;
    }

    function renderPage(root, featureId, content) {
        var base = assetBase();

        var glowLayer = el('div', 'glow-layer');
        glowLayer.appendChild(el('div', 'glow glow--top'));
        glowLayer.appendChild(el('div', 'glow glow--bottom'));
        root.appendChild(glowLayer);

        var main = el('main');

        // hero
        var hero = el('div', 'hero');
        var images = el('div', 'hero__images');
        content.images.forEach(function (name) {
            var img = el('img');
            img.src = base + name;
            img.alt = '';
            images.appendChild(img);
        });
        hero.appendChild(images);

        var heroText = el('div', 'hero__text');
        heroText.appendChild(el('h1', null, content.title));
        heroText.appendChild(el('p', 'hero__subtitle', content.description));
        hero.appendChild(heroText);
        hero.appendChild(renderCta(content, featureId));
        main.appendChild(hero);

        // what you'd get
        var values = el('section');
        values.appendChild(el('h2', null, content.valueTitle));
        var valueRows = el('div', 'rows');
        content.values.forEach(function (pair) {
            var row = el('div', 'value-row');
            row.appendChild(el('span', 'value-row__dot'));
            var text = el('div');
            text.appendChild(el('p', 'value-row__title', pair[0]));
            text.appendChild(el('p', 'value-row__subtitle', pair[1]));
            row.appendChild(text);
            valueRows.appendChild(row);
        });
        values.appendChild(valueRows);
        main.appendChild(values);

        // how it would work
        var steps = el('section');
        steps.appendChild(el('h2', null, content.stepsTitle));
        var stepRows = el('div', 'rows');
        content.steps.forEach(function (step, index) {
            var row = el('div', 'step-row');
            row.appendChild(el('span', 'step-row__num', String(index + 1)));
            row.appendChild(el('p', 'step-row__text', step));
            stepRows.appendChild(row);
        });
        steps.appendChild(stepRows);
        main.appendChild(steps);

        // closing block
        var closing = el('div', 'closing');
        var closingText = el('div', 'closing__text');
        closingText.appendChild(el('p', 'closing__title', content.closing.title));
        closingText.appendChild(el('p', 'closing__subtitle', content.closing.subtitle));
        closing.appendChild(closingText);
        closing.appendChild(renderCta(content, featureId));
        main.appendChild(closing);

        root.appendChild(main);
    }

    function start() {
        var root = document.getElementById('root');
        var rawId = resolveFeatureId();
        var featureId = rawId ? ALIASES[rawId] || rawId : null;
        var content = featureId ? CONTENT[featureId] : null;

        root.innerHTML = '';

        if (!content) {
            renderError(root);
            return;
        }

        document.title = content.title;
        renderPage(root, featureId, content);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
