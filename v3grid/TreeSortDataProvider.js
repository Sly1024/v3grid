ClassDefReq('v3grid.TreeSortDataProvider', {
    extends: 'v3grid.SortDataProviderBase',

    ctor: function TreeSortDataProvider(config) {
        this.super.ctor.call(this, config);
        this.nodes = {};
    },

    /* TreeDataProvider API - start */
    getRootId: function () {
        return this.dataProvider.getRootId();
    },

    getChildrenInfo: function (nodeId) {
        return this.nodes[nodeId] || this.sortChildren(nodeId);
    },

    getCellData: function (nodeId, colDataIdx) {
        return this.dataProvider.getCellData(nodeId, colDataIdx);
    },

    refresh: function () {
        this.sort(this.sortedBy);
    },
    /* TreeDataProvider API - end */

    sort: function (fields, noUpdate) {
        this.setFields(fields, noUpdate);
        this.nodes = {};

        if (!noUpdate) this.fireEvent('dataChanged');
    },

    unSort: function (noUpdate) {
        this.sort([], noUpdate);
    },

    sortChildren: function (nodeId) {
        var childrenInfo = this.dataProvider.getChildrenInfo(nodeId).slice(0);
        childrenInfo.sort(this.sortedBy.length ? this.getCompareFunction('id') : this.defaultSortFunc);
        return (this.nodes[nodeId] = childrenInfo);
    },

    defaultSortFunc: function (a, b) {
        a = (a.id == '') ? [] : a.id.split(',');
        b = (b.id == '') ? [] : b.id.split(',');

        for (var i = 0; i < a.length && i < b.length; ++i) {
            var na = +a[i], nb = +b[i];
            if (na < nb) return -1;
            if (na > nb) return 1;
        }
        return a.length - b.length;
    }

});
