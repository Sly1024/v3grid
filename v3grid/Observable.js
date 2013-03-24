define('v3grid/Observable', ['v3grid/Adapter'], function (Adapter) {
    var Observable = function (config) {
        if (config) Adapter.merge(this, config);
    };

    Observable.prototype = {
        addListener: function (event, handler, scope) {
            var listeners = this.listeners || (this.listeners = {});
            var list = listeners[event] || (listeners[event] = []);
            list.push({ handler: handler, scope: scope});
        },

        removeListener: function (event, handler, scope) {
            var listeners = this.listeners || (this.listeners = {});
            var list = listeners[event] || (listeners[event] = []);
            for (var len = list.length, i = 0; i < len; ++i) {
                if (list[i].handler === handler && list[i].scope === scope) {
                    list.splice(i, 1);
                }
            }
        },

        fireEvent: function (event) {
            var listeners = this.listeners || (this.listeners = {});
            var list = listeners[event];
            if (!list || list.length == 0) return;

            var args = Array.prototype.slice.call(arguments, 1);

            for (var len = list.length, i = 0; i < len; ++i) {
                list[i].handler.apply(list[i].scope, args);
            }
        }
    };

    return Observable;
});