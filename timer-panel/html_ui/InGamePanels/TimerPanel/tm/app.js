// Timer panel UI: LED display, two chronograph keys, mode / colour switches, presets and lap list.
(function (g) {
    'use strict';
    var TM = g.TM = g.TM || {};
    var STORE_KEY = 'tm.state.v1';
    var THEMES = ['amber', 'red', 'green'];
    var TICK_MS = 25;
    var BEEP_EVERY_MS = 1800;
    var BEEP_ROUNDS = 6;

    // The in-game font lacks several non-ASCII glyphs: labels stay ASCII.
    function h(tag, cls, text, parent) {
        var node = document.createElement(tag);
        if (cls) { node.className = cls; }
        if (text !== undefined) { node.textContent = text; }
        if (parent) { parent.appendChild(node); }
        return node;
    }

    // ---- Persistence (the sim's own store when present, localStorage in a browser) ----

    var store = TM.store = {
        read: function () {
            var raw = null;
            try { if (typeof GetStoredData === 'function') { raw = GetStoredData(STORE_KEY); } } catch (e) { raw = null; }
            try { if (!raw && g.localStorage) { raw = g.localStorage.getItem(STORE_KEY); } } catch (e) { raw = null; }
            try { return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; }
        },
        write: function (state) {
            var raw = JSON.stringify(state);
            try { if (typeof SetStoredData === 'function') { SetStoredData(STORE_KEY, raw); } } catch (e) { /* ignore */ }
            try { if (g.localStorage) { g.localStorage.setItem(STORE_KEY, raw); } } catch (e) { /* ignore */ }
        }
    };

    // ---- Alarm beeps ----

    var audio = null;
    function beep() {
        try {
            var Ctx = g.AudioContext || g.webkitAudioContext;
            if (!Ctx) { return; }
            audio = audio || new Ctx();
            [0, 0.22, 0.44].forEach(function (delay) {
                var t0 = audio.currentTime + delay;
                var osc = audio.createOscillator();
                var gain = audio.createGain();
                osc.type = 'square';
                osc.frequency.value = 1760;
                gain.gain.setValueAtTime(0.0001, t0);
                gain.gain.exponentialRampToValueAtTime(0.15, t0 + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
                osc.connect(gain);
                gain.connect(audio.destination);
                osc.start(t0);
                osc.stop(t0 + 0.16);
            });
        } catch (e) { /* no audio: the flashing display still works */ }
    }

    // ---- App ----

    function App(root) {
        var self = this;
        var saved = store.read();
        this.root = root;
        this.timer = new TM.Timer(saved.timer);
        this.theme = THEMES.indexOf(saved.theme) >= 0 ? saved.theme : THEMES[0];
        this.acked = this.timer.done;      // a countdown that ended before the panel opened is not announced again
        this.beepsLeft = 0;
        this.nextBeep = 0;
        this.lapCount = -1;
        this.last = {};

        root.className = 'tm-root';
        root.tabIndex = 0;

        var shell = h('div', 'tm-case', undefined, root);

        // Header: engraved label, state annunciators, switches.
        var head = h('div', 'tm-head', undefined, shell);
        var ann = h('div', 'tm-ann', undefined, head);
        this.modeEl = h('span', 'tm-ann-item', '', ann);
        this.lapEl = h('span', 'tm-ann-item', '', ann);
        var sw = h('div', 'tm-switches', undefined, head);
        this.modeBtn = this.button('tm-chip', 'UP / DOWN', function () { self.act('mode'); }, sw);
        this.modeBtn.title = 'Stopwatch / countdown (M)';
        this.themeBtn = this.button('tm-chip tm-led', 'LED', function () { self.act('theme'); }, sw);
        this.themeBtn.title = 'Display colour (T)';

        // Glass with the display.
        var glass = h('div', 'tm-glass', undefined, shell);
        this.display = new TM.Display(glass);
        h('div', 'tm-shine', undefined, glass);

        // Countdown length.
        this.presets = h('div', 'tm-presets', undefined, shell);
        [['-1m', -60000], ['+10s', 10000], ['+1m', 60000], ['+5m', 300000], ['+10m', 600000]].forEach(function (p) {
            self.button('tm-chip', p[0], function () { self.act('add', p[1]); }, self.presets);
        });
        this.button('tm-chip', 'CLR', function () { self.act('clr'); }, this.presets);

        // The two chronograph keys.
        var keys = h('div', 'tm-keys', undefined, shell);
        this.goBtn = this.button('tm-key tm-go', 'START', function () { self.act('toggle'); }, keys);
        this.goBtn.title = 'Start / stop (Space)';
        this.lapBtn = this.button('tm-key tm-lap', 'RESET', function () { self.act('lapreset'); }, keys);
        this.lapBtn.title = 'Lap while running, reset when stopped (L / R)';

        this.lapsEl = h('div', 'tm-laps', undefined, shell);

        root.addEventListener('mousedown', function () { self.ack(); });
        root.addEventListener('keydown', function (e) { self.onKey(e); });
        if (typeof document !== 'undefined') {
            document.addEventListener('keydown', function (e) { if (e.target === document.body) { self.onKey(e); } });
        }

        this.timer.tick(Date.now());
        this.render(true);
        this.interval = setInterval(function () { self.step(); }, TICK_MS);
    }

    App.prototype.button = function (cls, label, fn, parent) {
        var b = h('button', cls, label, parent);
        b.tabIndex = -1;
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });   // keep the focus on the panel, so Space does not click the button again
        b.addEventListener('click', fn);
        return b;
    };

    App.prototype.save = function () {
        store.write({ timer: this.timer.toJSON(), theme: this.theme });
    };

    // Any press silences the alarm.
    App.prototype.ack = function () {
        this.acked = true;
        this.beepsLeft = 0;
    };

    App.prototype.act = function (what, arg) {
        var t = this.timer, now = Date.now();
        this.ack();
        switch (what) {
            case 'toggle': t.toggle(now); break;
            case 'lap': t.lap(now); break;
            case 'reset': t.reset(); break;
            case 'lapreset': if (!t.lap(now)) { t.reset(); } break;
            case 'mode': t.setMode(t.mode === 'up' ? 'down' : 'up'); break;
            case 'add': t.addTarget(arg); break;
            case 'clr': t.clearTarget(); break;
            case 'theme': this.theme = THEMES[(THEMES.indexOf(this.theme) + 1) % THEMES.length]; break;
        }
        this.save();
        this.render(false);
    };

    App.prototype.onKey = function (e) {
        var key = e.key;
        var map = { ' ': 'toggle', 'Spacebar': 'toggle', 'Enter': 'toggle', l: 'lap', L: 'lap', r: 'reset', R: 'reset', Backspace: 'reset', m: 'mode', M: 'mode', t: 'theme', T: 'theme' };
        if (e.ctrlKey || e.altKey || e.metaKey || !map[key]) { return; }
        e.preventDefault();
        this.act(map[key]);
    };

    // Runs every TICK_MS: finishes a countdown, drives the alarm, repaints.
    App.prototype.step = function () {
        var now = Date.now();
        if (this.timer.tick(now) === 'finished') {
            this.acked = false;
            this.beepsLeft = BEEP_ROUNDS;
            this.nextBeep = 0;
            this.save();
        }
        if (this.beepsLeft > 0 && now >= this.nextBeep) {
            beep();
            this.beepsLeft--;
            this.nextBeep = now + BEEP_EVERY_MS;
        }
        this.render(false);
    };

    App.prototype.render = function (force) {
        var t = this.timer, now = Date.now(), last = this.last;
        var running = t.isRunning();
        var alarm = t.done && !this.acked;
        var blink = Math.floor(now / 250) % 2 === 0;

        var fields = TM.split(t.shown(now), t.mode === 'down');
        this.display.set(fields, running ? Math.floor(now / 500) % 2 === 0 : true, alarm && !blink);

        this.layout();

        // Everything below only changes on user action: skip the DOM when nothing differs.
        var key = [t.mode, running, t.done, t.target > 0, t.isClear(), this.theme, t.laps.length, this.acked, t.acc > 0].join('|');
        if (!force && key === last.key) { return; }
        last.key = key;

        var root = this.root;
        root.className = 'tm-root tm-theme-' + this.theme + (t.mode === 'down' ? ' tm-down' : ' tm-up') +
            (running ? ' tm-running' : '') + (this.sizeClass || '');
        this.modeEl.textContent = t.mode === 'down' ? 'COUNTDOWN' : 'STOPWATCH';
        this.lapEl.textContent = t.mode === 'up' && t.laps.length ? 'LAP ' + (t.laps.length < 10 ? '0' : '') + t.laps.length : (running ? 'RUN' : (t.done ? 'END' : 'STOP'));
        this.themeBtn.textContent = this.theme.toUpperCase();
        this.presets.style.display = t.mode === 'down' && t.acc === 0 && !running && !t.done ? '' : 'none';

        this.goBtn.textContent = running ? 'STOP' : (t.acc > 0 && !t.done ? 'RESUME' : 'START');
        this.goBtn.className = 'tm-key tm-go' + (running ? ' tm-stop' : '') + (!running && t.mode === 'down' && (t.done || t.target <= 0) ? ' tm-off' : '');
        var canLap = t.mode === 'up' && running;
        this.lapBtn.textContent = canLap ? 'LAP' : 'RESET';
        this.lapBtn.className = 'tm-key tm-lap' + (!canLap && t.isClear() ? ' tm-off' : '');

        this.renderLaps();
    };

    App.prototype.renderLaps = function () {
        var laps = this.timer.laps;
        var shown = this.timer.mode === 'up' ? laps : [];
        if (this.lapCount === shown.length && this.lapsMode === this.timer.mode) { return; }
        this.lapCount = shown.length;
        this.lapsMode = this.timer.mode;
        var box = this.lapsEl;
        while (box.firstChild) { box.removeChild(box.firstChild); }
        // The box stays (empty) in stopwatch mode so that the keys do not jump when the first lap arrives.
        box.style.display = this.timer.mode === 'up' ? '' : 'none';
        for (var i = shown.length - 1; i >= 0; i--) {
            var row = h('div', 'tm-lap-row', undefined, box);
            h('span', 'tm-lap-no', (i + 1 < 10 ? '0' : '') + (i + 1), row);
            h('span', 'tm-lap-split', TM.format(shown[i].split), row);
            h('span', 'tm-lap-total', TM.format(shown[i].total), row);
        }
    };

    // Optional parts give way when the panel is small. Chosen from the panel's own size
    // (a media query looks at the viewport, which in MSFS is not reliably the panel).
    App.prototype.layout = function () {
        var hgt = this.root.clientHeight, wid = this.root.clientWidth;
        var cls = (hgt && hgt < 250 ? ' tm-nolaps' : '') + (hgt && hgt < 170 ? ' tm-nohead' : '') + (wid && wid < 300 ? ' tm-narrow' : '');
        if (cls !== (this.sizeClass || '')) {
            this.sizeClass = cls;
            this.last.key = null;
        }
    };

    TM.App = App;
})(typeof window !== 'undefined' ? window : this);
