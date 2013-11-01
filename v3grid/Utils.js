ClassDef('v3grid.Utils', ['v3grid.Adapter'], function (Adapter) {
    return {
        singleton: true,
        minMax: function (num, min, max) {
            if (num < min) return min;
            if (num > max) return max;
            return num;
        },

        styleEncode: function (obj) {
            var str = [];
            for (var key in obj) if (obj.hasOwnProperty(key)) {
                var cssKey = key.replace(/([A-Z][a-z]*)/g, function(s, group1) {
                    return '-'+group1.toLowerCase();
                });
                str.push(cssKey+':'+obj[key]+';');
            }
            return str.join('');
        },

        cssEncode: function (cssClass, obj) {
            return '.' + cssClass + '{' + this.styleEncode(obj) + '}';
        },

        identity: function (x) { return x; },

        walkTree: function walk(roots, fn, childrenDoneFn, depth, parent) {
            depth = depth || 0;
            Adapter.arrayEach(roots, function (item, idx, arr) {
                fn(item, idx, arr, parent, depth);
                if (Adapter.isArray(item.children)) {
                    walk(item.children, fn, childrenDoneFn, depth + 1, item);
                    if (childrenDoneFn) childrenDoneFn(item);
                }
            });
        },

        nextFrame: (function() {
            return window.requestAnimationFrame
                || window.webkitRequestAnimationFrame
                || window.mozRequestAnimationFrame
                || window.oRequestAnimationFrame
                || window.msRequestAnimationFrame
                || function(callback) { return setTimeout(callback, 17); }
        })(),
        cancelFrame: (function () {
            return window.cancelRequestAnimationFrame
                || window.webkitCancelAnimationFrame
                || window.webkitCancelRequestAnimationFrame
                || window.mozCancelRequestAnimationFrame
                || window.oCancelRequestAnimationFrame
                || window.msCancelRequestAnimationFrame
                || clearTimeout
        })(),

        TapHandler: Class('v3grid.Utils.TapHandler', {
            ctor: function (element, handler, scope, tolerance) {
                this.t = tolerance || 10;
                this.element = element;
                this.handler = handler;
                this.scope = scope;
                Adapter.addListener(element, 'touchstart', this);
                Adapter.addListener(element, 'touchmove', this);
                Adapter.addListener(element, 'touchend', this);
            },
            handleEvent: function (evt) {
                switch (evt.type) {
                    case 'touchstart':
                        this.x = evt.pageX; this.y = evt.pageY; this.cancel = false;
                        break;
                    case 'touchmove':
                        var px = evt.pageX, py = evt.pageY, x = this.x, y = this.y, t = this.t;
                        if (px - x > t || x - px > t || py - y > t || y - py > t) this.cancel = true;
                        break;
                    case 'touchend':
                        if (!this.cancel) this.handler.call(this.scope, evt);
                        break;
                }
            },
            destroy: function () {
                var element = this.element;
                Adapter.removeListener(element, 'touchstart', this);
                Adapter.removeListener(element, 'touchmove', this);
                Adapter.removeListener(element, 'touchend', this);
            }
        })


    };

});
