define('v3grid/TreeDataProvider',
    ['v3grid/Adapter', 'v3grid/TreeMapper', 'v3grid/TreeRenderer'],
    function (Adapter, TreeMapper, TreeRenderer) {

        // needs renderer: TreeRenderer
        var TreeDataProvider = function (config) {
            config = config || {};
            config.renderer = config.renderer || TreeRenderer;
            Adapter.merge(this, config);
        };

// getCellData(treeIdx, col) ; getChildCount(treeIdx)
        TreeDataProvider.prototype = {
            treeColumnIdx: 0,
            indentation: 16,

            init: function (grid, config) {
                this.grid = grid;
                var root = this.root = {};
                root[this.childrenField] = this.data || config.data;

                this.processColumnRenderer(config.columns[this.treeColumnIdx]);
                var origInvData = this.origInvData = grid.invalidateData;

                var mapper = this.mapper = new TreeMapper(this);
                config.totalRowCount = mapper.totalCount;

                var me = this;
                config.getData = function (row, col) {
                    return me.getCellData(mapper.getTreeIdx(row), col);
                };

                config.invalidateData = function (row, col) {
                    origInvData.call(grid, invIndex[row], col);
                };

            },
            initRev: function (grid, config) {
                this.getDataRowIdx = config.getDataRowIdx || grid.getDataRowIdx;
            },
            processColumnRenderer: function (column) {
                this.treeColumnDataIdx = column.dataIndex;
                var rendererConfig = {
                    renderer:  this.grid.getRenderer(column.renderer || this.grid.itemRenderer),
                    rendererConfig: column.rendererConfig,
                    treeDataProvider: this
                };

                column.renderer = this.renderer;
                column.rendererConfig = rendererConfig;
            },

            childrenField: 'children',

            /*
             * Default implementation of getCellData(treeIdx, col) and getChildCount(treeIdx)
             * and a helper method getNode
             */

            getNode: function (treeIdx) {
                var node = this.root, children = this.childrenField;

                for (var len = treeIdx.length, i = 0; i < len; ++i) {
                    node = node[children][treeIdx[i]];
                }

                return node;
            },

            getCellData: function (treeIdx, col) {
                return this.getNode(treeIdx)[col];
            },

            getChildCount: function (treeIdx) {
                var node = this.getNode(treeIdx), children = this.childrenField;
                return (node && node[children]) ? node[children].length : 0;
            },

            /*
             * Called by TreeRenderer:
             *  rowClicked(linear_visible_row_idx, event)
             *  getInfo(row)
             */

            rowClicked: function (row, evt) {
                row = this.getDataRowIdx(row);
                var mapper = this.mapper;
                if (mapper.isOpen(row)) {
                    mapper.removeChildren(row);
                } else {
                    mapper.insertChildren(row);
                }
                this.grid.setTotalRowCount(mapper.totalCount);
            },

            // returns [childCount, isOpen(1:0), level] - array of ints
            getInfo: function (row) {
                row = this.getDataRowIdx(row);
                var treeIdx = this.mapper.getTreeIdx(row);
                return [
                    this.getChildCount(treeIdx),
                    this.mapper.isOpen(row) ? 1 : 0,
                    treeIdx.length-1
                ];
            },

            /*
             * level:
             * 0 -> close
             * n -> expand to level n
             * Infinity -> expand all
             */
            expandToLevel: function (level) {
                var mapper = this.mapper;

                for (var i = 0; i < mapper.totalCount; ++i) {
                    var shouldBeOpen = mapper.getTreeIdx(i).length <= level;
                    if (mapper.isOpen(i)) {
                        if (!shouldBeOpen) mapper.removeChildren(i);
                    } else {
                        if (shouldBeOpen) mapper.insertChildren(i);
                    }
                }

                this.grid.setTotalRowCount(mapper.totalCount);
            }


        };

        return TreeDataProvider;
    }
);