define('v3grid/DOMCache',
    ['v3grid/Adapter'],
    function (Adapter) {

        /**
         * config: {
         *     parentDom : DOMElement
         *     create: function() -> item: { dom : DOM }
         * }
         */
        var DOMCache = function (config) {
            Adapter.merge(this, config);
            this.available = [];
            this.addToDom = [];
        };

        DOMCache.prototype = {

            itemRemoved: Adapter.emptyFn,
            itemReleased: Adapter.emptyFn,
            initializeItem: Adapter.emptyFn,

            // returns instance
            get: function () {
                var item;
                if (this.available.length) {
                    item = this.available.pop();
                } else {
                    item = this.create.apply(this, arguments);
                    item.inDom = false;
                }

                if (!item.inDom) this.addToDom.push(item);

                Array.prototype.unshift.call(arguments, item);
                this.initializeItem.apply(this, arguments);

                return item;
            },

            release: function(item) {
                if (item.inDom) {
                    this.available.push(item);
                    this.itemReleased(item);
                }
            },

            validate: function () {
                var len, i, item;
                var parentDom = this.parentDom;

                for (len = this.available.length, i = 0; i < len; ++i) {
                    item = this.available[i];
                    if (item.inDom) {
                        parentDom.removeChild(item.dom);
                        item.inDom = false;
                        this.itemRemoved(item);
                    }
                }

                var addToDom = this.addToDom;

                for (len = addToDom.length, i = 0; i < len; ++i) {
                    item = addToDom[i];
                    parentDom.appendChild(item.dom);
                    item.inDom = true;
                }
                addToDom.length = 0;
            }
        };

        return DOMCache;
    }
);
