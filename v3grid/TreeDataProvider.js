define('v3grid/TreeDataProvider',
    ['v3grid/Adapter', 'v3grid/Observable'],
    function (Adapter, Observable) {

        var TreeDataProvider = function (config) {
            Adapter.merge(this, config);

            this.childrenField = this.childrenField || 'children';

            var root = this.data;
            if (Adapter.isArray(root)) {
                root = {};
                root[this.childrenField] = this.data;
            }
            this.root = root;
        };

        function getTreeIdx(nodeId) {
            return (nodeId == '') ? [] : nodeId.split(',');
        }

        TreeDataProvider.prototype = new Observable({

            // TreeDataProvider API - start
            getRootId: function () {
                return '';
            },

            getChildrenInfo: function (nodeId) {
                var treeIdx = getTreeIdx(nodeId),
                    depth = treeIdx.length + 1,
                    childrenField = this.childrenField,
                    children = this.getNode(treeIdx)[childrenField];

                return Adapter.isArray(children) ? Adapter.arrayMap(children, function (child, index) {
                    var children = child[childrenField];
                    return {
                        id: treeIdx.concat(index).join(','),
                        depth: depth,
                        childCount: Adapter.isArray(children) ? children.length : 0
                    };
                }) : [];
            },

            getCellData: function (nodeId, colDataIdx) {
                return this.getNode(getTreeIdx(nodeId))[colDataIdx];
            },

            refresh: function () {
                this.fireEvent('dataChanged');
            },
            // TreeDataProvider API - end

            getNode: function (treeIdx) {
                var node = this.root, children = this.childrenField;

                for (var len = treeIdx.length, i = 0; i < len; ++i) {
                    node = node[children][treeIdx[i]];
                }

                return node;
            }
        });

        return TreeDataProvider;
    }
);