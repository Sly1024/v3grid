Ext.require([
    'Ext.Array',
    'Ext.Error',
    'Ext.util.Observable',
    'Ext.ClassManager',
    'Ext.util.CSS',
    'Ext.Function',
    'Ext.dom.Element'
], function () {

define('v3grid/Adapter', [], function () {
    var Adapter = {
        // properties
        hasTouch: !!('ontouchstart' in Ext.global),
        isWebKit: Ext.isWebKit,
        isFireFox: Ext.firefoxVersion > 0,
        isIE: Ext.isIE,
        ieVersion: Ext.ieVersion,
        emptyFn: Ext.emptyFn,

        // functions
        isString: Ext.isString,
        isFunction: Ext.isFunction,
        isArray: Ext.isArray,
        indexOf: Ext.Array.indexOf,
        merge: Ext.apply,
        bindScope: Ext.bind,
        error: Ext.Error.raise,
        arrayMap: Ext.Array.map,
        arrayRemove: Ext.Array.remove,
        arrayEach: Ext.Array.forEach,

        getClass: function (cls) { return Ext.isString(cls) ? Ext.ClassManager.get(cls) : cls; },

        createStyleSheet: Ext.Function.alias(Ext.util.CSS, 'createStyleSheet'),
        removeStyleSheet: Ext.Function.alias(Ext.util.CSS, 'removeStyleSheet'),
        getCSSRule: function (sheet, indexOrSelector) {
            var rules = sheet.rules || sheet.cssRules;
            if (typeof indexOrSelector == 'number') return rules[indexOrSelector];
            for (var len = rules.length, i = 0; i < len; ++i) {
                if (rules[i].selectorText == indexOrSelector) return rules[i];
            }
            return null;
        },

        // returns index
        insertCSSRule: function (sheet, selector, ruleText) {
            var idx = (sheet.rules || sheet.cssRules).length;
            if (sheet.insertRule) {
                sheet.insertRule(selector + '{' + ruleText + '}', idx);
            } else {
                if (!ruleText) ruleText = ' ';
                sheet.addRule(selector, ruleText, idx);
            }
            return (sheet.rules || sheet.cssRules)[idx];
        },

        removeCSSRule: function (sheet, indexOrRule) {
            var rules = sheet.rules || sheet.cssRules;

            if (typeof indexOrRule != 'number') {
                // TODO: find a better indexOf that works on CSSRuleList
                indexOrRule = Adapter.indexOf(Array.prototype.slice.call(rules, 0), indexOrRule);
            }

            if (sheet.removeRule) {
                sheet.removeRule(indexOrRule);
            } else {
                sheet.deleteRule(indexOrRule);
            }
        },

        addClass: function (element, cls) { Ext.fly(element).addCls(cls); },
        removeClass: function (element, cls) { Ext.fly(element).removeCls(cls); },

        createThrottled: Ext.Function.createThrottled,
        createBuffered: Ext.Function.createBuffered,

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

        // I could use Ext.data.UuidGenerator, but this is faster
        // not real GUID, but I just need a big random number
        generateUID: function () {
            //this gives 4x32 = 128 random bits
            var r1 = Math.random()*0x100000000,
                r2 = Math.random()*0x100000000,
                r3 = Math.random()*0x100000000,
                r4 = Math.random()*0x100000000;

            // make it compact => base 36 (0..9, a..z) encoding
            return r1.toString(36) + r2.toString(36) + r3.toString(36) + r4.toString(36);
        },

        getPageX: function (element) { return Ext.fly(element).getX(); },
        getPageY: function (element) { return Ext.fly(element).getY(); },

        fixPageCoords: function (event) {
            if ( event.pageX == null && event.clientX != null ) {
                var doc = document.documentElement, body = document.body;
                event.pageX = event.clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc && doc.clientLeft || body && body.clientLeft || 0);
                event.pageY = event.clientY + (doc && doc.scrollTop  || body && body.scrollTop  || 0) - (doc && doc.clientTop  || body && body.clientTop  || 0);
            }
        },

        setTransformFunction: function () {
            this.transXPre = 'translateX(';
            this.transXPost = ')';

            if (Adapter.isWebKit) {
                this.setY = function (el, val) { el.style['-webkit-transform'] = 'translate3d(0,'+ val + 'px,0)'; };
                this.setPos = function (el, x, y) {el.style['-webkit-transform'] = 'translate3d('+x+'px,'+y+'px,0)'; };
                this.transXProp = '-webkit-transform';

                // In FireFox I use top/left, because it seems to be faster

//            } else if (Adapter.isFireFox) {
//                this.setY = function (el, val) { el.style['MozTransform'] = 'translate3d(0,'+ val + 'px,0)'; };
//                this.transXProp = 'MozTransform';
//                this.transXPre = 'translate3d(';
//                this.transXPost = ',0,0)';
            } else if (Adapter.ieVersion >= 9) {
                this.setY = function (el, val) { el.style['msTransform'] = 'translateY('+ val + 'px)'; };
                this.setPos = function (el, x, y) {el.style['msTransform'] = 'translate('+x+'px,'+y+'px)'; };
                this.transXProp = 'msTransform';
            } else {
                this.setY = function (el, val) { el.style['top'] = val + 'px'; };
                this.setPos = function (el, x, y) { el.style.left = x+'px'; el.style.top = y+'px'; };
                this.transXPre = '';
                this.transXPost = '';
                this.transXProp = 'left';
            }
        },

        setXCSS: function (rule, x) {
            rule.style[Adapter.transXProp] = Adapter.transXPre + (x + 'px') + Adapter.transXPost;
        }
    };

    Adapter.setTransformFunction();
    if (!Adapter.isIE) Adapter.fixPageCoords = Adapter.emptyFn;

    return Adapter;
});

});