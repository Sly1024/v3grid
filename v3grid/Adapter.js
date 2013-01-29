define('v3grid/Adapter', [], function () {
    var Adapter = {
        // properties
        hasTouch: !!('ontouchstart' in Ext.global),
        isWebKit: Ext.isWebKit,
        isFireFox: Ext.firefoxVersion > 0,
        isIE: Ext.isIE,
        emptyFn: Ext.emptyFn,

        // functions
        isString: Ext.isString,
        isFunction: Ext.isFunction,
        isArray: Ext.isArray,
        indexOf: Ext.Array.indexOf,
        merge: Ext.apply,
        bindScope: Ext.bind,
        error: function (msg) { throw new Error(msg); },

        getClass: function (cls) { return Ext.isString(cls) ? Ext.ClassManager.get(cls) : cls; },

        createStyleSheet: Ext.bind(Ext.util.CSS.createStyleSheet, Ext.util.CSS),
        updateCSSRule: Ext.bind(Ext.util.CSS.updateRule, Ext.util.CSS),

        addClass: function (element, cls) { Ext.fly(element).addCls(cls); },
        removeClass: function (element, cls) {
//            if (!cls) {
//                console.log('Oops, no cls', cls);
//                return;
//            }
//            if (!Ext.fly(element).hasCls(cls)) {
//                console.log('Oops, no cls', element, cls);
//            }
            Ext.fly(element).removeCls(cls);
        },

        listeners: [],

        addListener: function (element, event, handler, scope, useCapture) {
            var wrapper = scope ? Adapter.bindScope(handler, scope) : handler;
            if (element.attachEvent) {
                element.attachEvent('on' + event, wrapper);
            } else {
                element.addEventListener(event, wrapper, useCapture || false);
            }
            Adapter.listeners.push({ element:element, event:event, handler: handler, scope: scope, capture: useCapture, wrapper:wrapper });
        },

        removeListener: function (element, event, handler, scope, useCapture) {
            var listeners =  Adapter.listeners;
            var wrapper = null;
            for (var len = listeners.length, i = 0; i < len; ++i) {
                var listener = listeners[i];
                if (listener.element == element && listener.event == event &&
                    listener.handler == handler && listener.scope == scope &&
                    listener.capture == useCapture) {
                    wrapper = listener.wrapper;
                    listeners.splice(i, 1);
                    break;
                }
            }

            if (!wrapper) return;

            if (element.detachEvent) {
                element.detachEvent('on' + event, wrapper);
            } else {
                element.removeEventListener(event, wrapper, useCapture || false);
            }
        },

        getPageX: function (element) { return Ext.fly(element).getX(); },
        getPageY: function (element) { return Ext.fly(element).getY(); },

        fixPageCoords: function (evt) {
            if (typeof evt.pageX != 'number') {
                var node = evt.srcElement;

                evt.pageX = Adapter.getPageX(node) + evt.offsetX;
                evt.pageY = Adapter.getPageY(node) + evt.offsetY;
            }
        },

        setTransformFunction: function () {
            this.transXPre = 'translateX(';
            this.transXPost = ')';

            if (Adapter.isWebKit) {
                this.setY = function (el, val) { el.style['-webkit-transform'] = 'translate3d(0,'+ val + 'px,0)'; };
//                this.setY = function (el, val) { el.style['-webkit-transform'] = 'translateY('+ val + 'px)'; };
                this.transXProp = '-webkit-transform';
            } else if (Adapter.isFireFox) {
//                this.setY = function (el, val) { el.style['MozTransform'] = 'translate3d(0,'+ val + 'px,0)'; };
                this.setY = function (el, val) { el.style['top'] = val + 'px'; };
//                this.transXProp = 'MozTransform';
                this.transXProp = 'left';
                this.transXPre = '';
                this.transXPost = '';
            } else if (Adapter.isIE) {
                this.setY = function (el, val) { el.style['msTransform'] = 'translateY('+ val + 'px)'; };
                this.transXProp = 'msTransform';
            } else {
                this.setY = function (el, val) { el.style['top'] = val + 'px'; };
                this.transXPre = '';
                this.transXPost = '';
                this.transXProp = 'left';
            }
        },

        setXCSS: function (rule, x) {
            Adapter.updateCSSRule(rule, Adapter.transXProp, Adapter.transXPre + (x + 'px') + Adapter.transXPost);
        }
    };

    Adapter.setTransformFunction();

    return Adapter;
});