define('v3grid/TreeSortDataProvider',
    ['v3grid/Adapter', 'v3grid/SortDataProviderBase'],
    function (Adapter, SortDataProviderBase) {

        var TreeSortDataProvider = function (config) {
            SortDataProviderBase.call(this, config);
            this.sortedBy = [];
            this.nodes = {};
        };

        TreeSortDataProvider.prototype = new SortDataProviderBase({
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
                if (!noUpdate) this.updateIndicators(fields);

                this.sortedBy = fields;
                this.nodes = {};

                if (!noUpdate) this.fireEvent('dataChanged');
            },

            unSort: function (noUpdate) {
                this.sort([], noUpdate);
            },

            sortChildren: function (nodeId) {
                var childrenInfo = this.dataProvider.getChildrenInfo(nodeId).slice(0);
                childrenInfo.sort(this.getCompareFunction('id'));
                return this.nodes[nodeId] = childrenInfo;
            }

        });

        return TreeSortDataProvider;
    }
);
