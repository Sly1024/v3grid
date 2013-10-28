ClassDefReq('v3grid.TreeDataProvider', ['v3grid.Adapter'],
    function (Adapter) {
        function getTreeIdx(nodeId) {
            return (nodeId == '') ? [] : nodeId.split(',');
        }

        return {
            extends: 'v3grid.Observable',

            ctor: function TreeDataProvider(config) {
                Adapter.merge(this, config);

                this.childrenField = this.childrenField || 'children';
                this.setData(this.data, true);
            },

            setData: function (data, noUpdate) {
                if (Adapter.isArray(data)) {
                    this.root = {};
                    this.root[this.childrenField] = data;
                } else {
                    this.root = data;
                }
                if (!noUpdate) this.fireEvent('dataChanged');
            },

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
        };
    }
);