// Timer model: a stopwatch (count up, with laps) and a countdown. No DOM in here, so it can be tested alone.
// Time is passed in by the caller (Date.now() in the panel), which lets the timer keep running
// while the panel is closed and be restored from its saved state.
(function (g) {
    'use strict';
    var TM = g.TM = g.TM || {};

    var MAX_TARGET = 99 * 3600000 + 59 * 60000 + 59000;   // 99:59:59, the display holds two hour digits
    var MAX_LAPS = 99;

    function Timer(state) {
        this.mode = 'up';        // 'up' stopwatch, 'down' countdown
        this.target = 0;         // countdown length, ms
        this.acc = 0;            // elapsed ms before the current run
        this.startedAt = null;   // epoch ms of the current run, null when stopped
        this.laps = [];          // [{ total, split }] in ms, oldest first
        this.done = false;       // countdown reached zero and has not been reset
        if (state) { this.load(state); }
    }
    TM.Timer = Timer;

    Timer.prototype.isRunning = function () { return this.startedAt !== null; };

    Timer.prototype.elapsed = function (now) {
        return this.acc + (this.startedAt !== null ? Math.max(0, now - this.startedAt) : 0);
    };

    // Milliseconds to put on the display.
    Timer.prototype.shown = function (now) {
        if (this.mode === 'down') { return Math.max(0, this.target - this.elapsed(now)); }
        return this.elapsed(now);
    };

    // True once something has been counted (or a countdown has been set), so Reset has an effect.
    Timer.prototype.isClear = function () {
        return this.acc === 0 && this.startedAt === null && !this.done && this.laps.length === 0;
    };

    Timer.prototype.start = function (now) {
        if (this.isRunning() || this.done) { return false; }
        if (this.mode === 'down' && this.target - this.acc <= 0) { return false; }
        this.startedAt = now;
        return true;
    };

    Timer.prototype.stop = function (now) {
        if (!this.isRunning()) { return false; }
        this.acc = this.elapsed(now);
        this.startedAt = null;
        return true;
    };

    Timer.prototype.toggle = function (now) {
        return this.isRunning() ? this.stop(now) : this.start(now);
    };

    Timer.prototype.reset = function () {
        this.acc = 0;
        this.startedAt = null;
        this.laps = [];
        this.done = false;
    };

    // Lap time: only while the stopwatch runs. Records the total and the time since the previous lap.
    Timer.prototype.lap = function (now) {
        if (this.mode !== 'up' || !this.isRunning()) { return false; }
        var total = this.elapsed(now);
        var prev = this.laps.length ? this.laps[this.laps.length - 1].total : 0;
        this.laps.push({ total: total, split: total - prev });
        if (this.laps.length > MAX_LAPS) { this.laps.shift(); }
        return true;
    };

    Timer.prototype.setMode = function (mode) {
        if (mode !== 'up' && mode !== 'down') { return; }
        if (mode === this.mode) { return; }
        this.reset();
        this.mode = mode;
    };

    // Adjust the countdown length. Only possible before it has been started.
    Timer.prototype.addTarget = function (ms) {
        if (this.mode !== 'down' || this.acc !== 0 || this.isRunning() || this.done) { return false; }
        this.target = Math.min(MAX_TARGET, Math.max(0, this.target + ms));
        return true;
    };

    Timer.prototype.clearTarget = function () {
        if (this.mode !== 'down' || this.acc !== 0 || this.isRunning() || this.done) { return false; }
        this.target = 0;
        return true;
    };

    // Call regularly. Returns 'finished' once, when a running countdown reaches zero.
    Timer.prototype.tick = function (now) {
        if (this.mode === 'down' && this.isRunning() && this.elapsed(now) >= this.target) {
            this.acc = this.target;
            this.startedAt = null;
            this.done = true;
            return 'finished';
        }
        return null;
    };

    Timer.prototype.toJSON = function () {
        return { mode: this.mode, target: this.target, acc: this.acc, startedAt: this.startedAt, laps: this.laps, done: this.done };
    };

    Timer.prototype.load = function (s) {
        function num(v, max) { return typeof v === 'number' && isFinite(v) ? Math.min(max, Math.max(0, v)) : 0; }
        this.mode = s.mode === 'down' ? 'down' : 'up';
        this.target = num(s.target, MAX_TARGET);
        this.acc = num(s.acc, 1e12);
        this.startedAt = typeof s.startedAt === 'number' && isFinite(s.startedAt) ? s.startedAt : null;
        this.done = !!s.done;
        this.laps = [];
        if (Array.isArray(s.laps)) {
            for (var i = 0; i < s.laps.length && i < MAX_LAPS; i++) {
                var l = s.laps[i];
                if (l && typeof l.total === 'number' && typeof l.split === 'number') { this.laps.push({ total: l.total, split: l.split }); }
            }
        }
    };

    // Splits milliseconds into display fields. A countdown rounds up so that it shows 00:00:01.00
    // for the whole last second and 00:00:00.00 only at the end.
    TM.split = function (ms, roundUp) {
        var cs = roundUp ? Math.ceil(ms / 10) : Math.floor(ms / 10);
        cs = Math.max(0, cs) % (100 * 3600 * 100);          // wraps after 99:59:59.99
        return {
            h: Math.floor(cs / 360000),
            m: Math.floor(cs / 6000) % 60,
            s: Math.floor(cs / 100) % 60,
            cs: cs % 100
        };
    };

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    // "1:02:03.45", or "2:03.45" under one hour. Used in the lap list.
    TM.format = function (ms) {
        var t = TM.split(ms, false);
        return (t.h ? t.h + ':' + pad(t.m) : String(t.m)) + ':' + pad(t.s) + '.' + pad(t.cs);
    };
})(typeof window !== 'undefined' ? window : this);
