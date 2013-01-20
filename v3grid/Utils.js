define('v3grid/Utils', ['v3grid/Adapter'], function (Adapter) {
    var addListener = Adapter.addListener,
        removeListener = Adapter.removeListener;

    var Utils = {
        preloadImages: function (images) {
            var img = Utils.img = Utils.img || new Image();
            if (!Adapter.isArray(images)) images = [images];

            for (var len = images.length, i = 0; i < len; ++i) {
                img.src = images[i];
            }

            img.src = null;
        },

        // There's a Ext.Function.createThrottled, but it does clearTimeout()/setTimeout() unnecessarily
        createThrottled: function (fn, interval, scope) {
            var lastCallTime = 0, lastArgs, timer = -1, execute = function() {
                fn.apply(scope || this, lastArgs);
                lastCallTime = +new Date();
                timer = -1;
            };

            return function() {
                var elapsed = +new Date() - lastCallTime;
                lastArgs = arguments;

                if (elapsed >= interval) {
                    execute();
                } else if (timer == -1) {
                    timer = setTimeout(execute, interval - elapsed);
                }
            };
        },

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

        getProperties: function (obj, props) {
            var result = {};
            for (var len = props.length, i = 0; i < len; ++i) {
                result[props[i]] = obj[props[i]];
            }
            return result;
        },

        TapHandler: function (element, handler, scope, tolerance) {
            this.t = tolerance || 10;
            this.element = element;
            this.handler = handler;
            this.scope = scope;
            addListener(element, 'touchstart', this);
            addListener(element, 'touchmove', this);
            addListener(element, 'touchend', this);
        }

    };

    Utils.TapHandler.prototype = {
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
            removeListener(element, 'touchstart', this);
            removeListener(element, 'touchmove', this);
            removeListener(element, 'touchend', this);
        }
    }

    return Utils;
});
