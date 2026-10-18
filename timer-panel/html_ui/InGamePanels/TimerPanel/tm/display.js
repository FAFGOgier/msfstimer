// Seven-segment display drawn as SVG: HH:MM:SS with small hundredths. Unlit segments stay visible as
// faint "ghosts", like on a real LED or LCD module. Colours come from CSS (.tm-seg, .tm-seg.on).
(function (g) {
    'use strict';
    var TM = g.TM = g.TM || {};
    var NS = 'http://www.w3.org/2000/svg';

    var T = 9;                 // segment thickness
    var DIGIT_W = 50, DIGIT_H = 100;
    var SMALL = 0.6;           // scale of the hundredths
    var LEAN = 6;              // italic lean, degrees

    // Segments a b c d e f g, as horizontal / vertical bars (centre x, centre y, length).
    var BARS = [
        ['h', 25, 5, 30],      // a  top
        ['v', 45, 27.5, 35],   // b  top right
        ['v', 45, 72.5, 35],   // c  bottom right
        ['h', 25, 95, 30],     // d  bottom
        ['v', 5, 72.5, 35],    // e  bottom left
        ['v', 5, 27.5, 35],    // f  top left
        ['h', 25, 50, 30]      // g  middle
    ];
    var MASKS = {
        '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg',
        '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg'
    };

    function el(tag, attrs, parent) {
        var n = document.createElementNS(NS, tag);
        for (var k in attrs) { if (attrs.hasOwnProperty(k)) { n.setAttribute(k, attrs[k]); } }
        if (parent) { parent.appendChild(n); }
        return n;
    }

    function bar(b) {
        var cx = b[1], cy = b[2], half = b[3] / 2, r = T / 2, pts;
        if (b[0] === 'h') {
            pts = [[cx - half, cy], [cx - half + r, cy - r], [cx + half - r, cy - r], [cx + half, cy], [cx + half - r, cy + r], [cx - half + r, cy + r]];
        } else {
            pts = [[cx, cy - half], [cx + r, cy - half + r], [cx + r, cy + half - r], [cx, cy + half], [cx - r, cy + half - r], [cx - r, cy - half + r]];
        }
        return pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' ');
    }

    function Digit(parent, x, y, scale) {
        this.group = el('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + scale + ')' }, parent);
        this.segs = BARS.map(function (b) { return el('polygon', { 'class': 'tm-seg', points: bar(b) }, this.group); }, this);
        this.value = null;
    }
    Digit.prototype.set = function (ch) {
        if (ch === this.value) { return; }
        this.value = ch;
        var mask = MASKS[ch] || '';
        for (var i = 0; i < 7; i++) {
            this.segs[i].setAttribute('class', mask.indexOf('abcdefg'.charAt(i)) >= 0 ? 'tm-seg on' : 'tm-seg');
        }
    };

    function Colon(parent, x) {
        this.dots = [30, 70].map(function (cy) {
            return el('rect', { 'class': 'tm-seg', x: x - T / 2, y: cy - T / 2, width: T, height: T }, parent);
        });
        this.value = null;
    }
    Colon.prototype.set = function (on) {
        if (on === this.value) { return; }
        this.value = on;
        this.dots.forEach(function (d) { d.setAttribute('class', on ? 'tm-seg on' : 'tm-seg'); });
    };

    function Display(parent) {
        var tilt = Math.tan(LEAN * Math.PI / 180);
        var svg = el('svg', { 'class': 'tm-svg', preserveAspectRatio: 'xMidYMid meet' }, parent);
        // Digits are laid out left to right; the group is skewed afterwards.
        var body = el('g', {}, svg);
        var x = 0, gap = 8, sep = 24;
        this.digits = [];
        this.colons = [];
        var self = this;

        function pair() {
            self.digits.push(new Digit(body, x, 0, 1)); x += DIGIT_W + gap;
            self.digits.push(new Digit(body, x, 0, 1)); x += DIGIT_W;
        }
        function colon() {
            self.colons.push(new Colon(body, x + sep / 2));
            x += sep;
        }
        pair(); colon(); pair(); colon(); pair();

        // Hundredths: small, sitting on the same baseline, after a dot.
        var dotX = x + 9;
        this.dot = el('rect', { 'class': 'tm-seg on', x: dotX - 4, y: DIGIT_H - 9, width: 9, height: 9 }, body);
        x += 18;
        var smallH = DIGIT_H * SMALL;
        this.digits.push(new Digit(body, x, DIGIT_H - smallH, SMALL)); x += DIGIT_W * SMALL + 6;
        this.digits.push(new Digit(body, x, DIGIT_H - smallH, SMALL)); x += DIGIT_W * SMALL;

        var pad = 6;
        body.setAttribute('transform', 'translate(' + (pad + tilt * DIGIT_H) + ' ' + pad + ') skewX(' + (-LEAN) + ')');
        svg.setAttribute('viewBox', '0 0 ' + (x + tilt * DIGIT_H + 2 * pad) + ' ' + (DIGIT_H + 2 * pad));
        this.svg = svg;
        this.blank = false;
    }

    function two(n) { return (n < 10 ? '0' : '') + n; }

    // fields: {h, m, s, cs}. colon: whether the colons are lit. blank: hide everything lit (alarm flash).
    Display.prototype.set = function (t, colon, blank) {
        var text = two(t.h) + two(t.m) + two(t.s) + two(t.cs);
        for (var i = 0; i < 8; i++) { this.digits[i].set(blank ? ' ' : text.charAt(i)); }
        this.colons.forEach(function (c) { c.set(!blank && colon); });
        this.dot.setAttribute('class', blank ? 'tm-seg' : 'tm-seg on');
    };

    TM.Display = Display;
})(typeof window !== 'undefined' ? window : this);
