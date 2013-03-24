define('v3grid/TreeFilterDataProvider',
    ['v3grid/Adapter', 'v3grid/FilterDataProviderBase'],
    function (Adapter, FilterDataProviderBase) {

        var TreeFilterDataProvider = function (config) {
            FilterDataProviderBase.call(this, config);
            this.update();
        };

        TreeFilterDataProvider.prototype = new FilterDataProviderBase({
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
                        childrenInfo = dataProvider.getChildrenInfo(nodeId),
                        rowCount = childrenInfo ? childrenInfo.length : 0,
                        idx = 0;

                    for (var i = 0; i < rowCount; ++i) {
                        var pass = true;
                        if (!filterChildren(childrenInfo[i].id)) {
                            for (var len = filters.length, f = 0; f < len; ++f) {
                                if (!filters[f].filter(dataProvider, childrenInfo[i].id)) {
                                    pass = false;
                                    break;
                                }
                            }
                        }
                        if (pass) {
                            filtered[idx++] = childrenInfo[i];
                        }
                    }
                    nodes[nodeId] = filtered;
                    return filtered.length > 0;
                }

                filterChildren(dataProvider.getRootId());
            }
        });

        return TreeFilterDataProvider;
    }
);