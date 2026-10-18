// Entry point shared by the MSFS panel and the browser test bench.
(function (g) {
    'use strict';
    var TM = g.TM = g.TM || {};

    TM.mount = function (root) {
        TM.app = new TM.App(root);
        return TM.app;
    };

    var auto = document.getElementById('tm-root');
    if (auto) { TM.mount(auto); }
})(typeof window !== 'undefined' ? window : this);
