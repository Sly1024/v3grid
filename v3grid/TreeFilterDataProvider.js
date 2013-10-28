ClassDefReq('v3grid.TreeFilterDataProvider', {
    extends: 'v3grid.FilterDataProviderBase',

    ctor: function TreeFilterDataProvider(config) {
        this.super.ctor.call(this, config);
        this.update();
    },

    // TreeDataProvider API - start
    getRootId: function () {
        return this.dataProvider.getRootId();
    },

    getChildrenInfo: function (nodeId) {
        return this.nodes[nodeId];
    },

    getCellData: function (nodeId, colDataIdx) {
        return this.dataProvider.getCellData(nodeId, colDataIdx);
    },
    // TreeDataProvider API - end

    update: function () {
        var nodes = this.nodes = {},
            filters = this.filters,
            dataProvider = this.dataProvider;

        function filterChildren(nodeId) {
            var filtered = [],
                childrenInfo = dataProvider.getChildrenInfo(nodeId).slice(0),
                rowCount = childrenInfo ? childrenInfo.length : 0,
                idx = 0;

            for (var i = 0; i < rowCount; ++i) {
                var pass = true,
                    chCount = filterChildren(childrenInfo[i].id);

                if (chCount == 0) {
                    for (var len = filters.length, f = 0; f < len; ++f) {
                        if (!filters[f].filter(dataProvider, childrenInfo[i].id)) {
                            pass = false;
                            break;
                        }
                    }
                }
                if (pass) {
                    childrenInfo[i].childCount = chCount;
                    filtered[idx++] = childrenInfo[i];
                }
            }
            nodes[nodeId] = filtered;
            return filtered.length;
        }

        filterChildren(dataProvider.getRootId());
    }
});