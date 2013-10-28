ClassDefReq('v3grid.DOMCache', {
    requires: ['v3grid.Adapter'],
    itemRemoved: v3grid.Adapter.emptyFn,
    itemReleased: v3grid.Adapter.emptyFn,
    initializeItem: v3grid.Adapter.emptyFn,

    /**
     * config: {
     *     parentDom : DOMElement
     *     // template functions
     *     create: function(get_args...) -> item: { dom : DOM }
     *     initializeItem: function(item, get_args...)
     *     itemReleased: function (item)
     *     itemRemoved: function (item)
     * }
     */
    ctor: function DOMCache(config) {
        v3grid.Adapter.merge(this, config);
        this.available = [];
        this.addToDom = [];
    },

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

});
