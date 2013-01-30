define('v3grid/DOMCache',
    ['v3grid/Adapter'],
    function (Adapter) {

        /**
         * config: {
         *     parentDom : DOMElement
         *     create: function() -> item: { dom : DOM }
         * }
         */
        var Cache = function (config) {
            Adapter.merge(this, config);
            this.available = [];
            this.addToDom = [];
        }

        Cache.prototype = {

            // returns instance
            add: function () {
                var item;
                if (this.available.length) {
                    item = this.available.pop();
                } else {
                    item = this.create();
                    item.inDom = false;
                }

                if (!item.inDom) this.addToDom.push(item);

                this.initializeItem(item);

                return item;
            },

            remove: function(item) {
                if (item.inDom) {
                    this.available.push(item);
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
                    }
                }

                var addToDom = this.addToDom;

                for (len = addToDom.length, i = 0; i < len; ++i) {
                    item = addToDom[i];
                    parentDom.appendChild(item.dom);
                    item.inDom = true;
                }
                addToDom.length = 0;
            },

            initializeItem: Adapter.emptyFn
        }

        return Cache;
    }
);