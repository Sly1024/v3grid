define('v3grid/FilterDataProvider',
    ['v3grid/Adapter', 'v3grid/InlineFilterHeaderRenderer', 'v3grid/TextFilter', 'v3grid/Observable'],
    function (Adapter, HeaderRenderer, TextFilter, Observable) {

        var FilterDataProvider = function (config) {
            config = config || {};
            config.headerRenderer = config.headerRenderer || HeaderRenderer;
            this.filters = [];
            Adapter.merge(this, config);
        };

        FilterDataProvider.prototype = Adapter.merge(new Observable(), {
            init: function (grid, config) {
                this.grid = grid;

//                var origGetData = this.origGetData = config.getData;
//                var origGetVisibleRowIdx = config.getVisibleRowIdx || grid.getVisibleRowIdx;

                var index = this.index = new Array();
                var invIndex = this.invIndex = new Array();
                invIndex[-1] = -1;

                this.dataProvider.addListener('dataChanged', this.refresh, this);
//                config.getData = function (row, col) {
//                    return origGetData.call(grid, index[row], col);
//                };
//
//                config.getVisibleRowIdx = function (row) {
//                    return invIndex[origGetVisibleRowIdx.call(grid, row)];
//                };

                this.update(true);
//                config.totalRowCount = index.length;
            },

            initRev: function (grid, config) {
                this.processColumnRenderers(config.columns);

                config.headerHeight = (config.headerHeight || grid.headerHeight) + 20;
//                this.origSetTotalRowCount = config.setTotalRowCount || grid.setTotalRowCount;
//                var origInvData = config.invalidateData || grid.invalidateData;
//                var origGetDataRowIdx = config.getDataRowIdx || grid.getDataRowIdx;
//                var me = this, index = this.index;
//
//                config.getDataRowIdx = function (row) {
//                    return index[origGetDataRowIdx.call(grid, row)];
//                };
//
//                config.setTotalRowCount = function (rowCount) {
//                    me.totalRowCount = rowCount;
//                    me.update();
//                };
//                config.invalidateData = function (row, col) {
//                    row = me.invIndex[row];
//                    if (row >= 0) origInvData.call(grid, row, col);
//                };
//                config.updateView = function () {
//                    me.update();
//                };
            },

            getRowCount: function () {
                return this.rowCount;
            },

            getRowId: function (row) {
                return this.index[row];
            },

            getCellData: function (row, col) {
                return this.dataProvider.getCellData(this.index[row], col);
            },

            refresh: function () {
                this.update();
                this.fireEvent('dataChanged');
            },

            processColumnRenderers: function (columns) {
                var grid = this.grid;
                //var colMap = this.columnMap = {};

                for (var len = columns.length, i = 0; i < len; ++i) {
                    var col = columns[i];
                    var rendererConfig = {
                        renderer: grid.getRenderer(col.headerRenderer || grid.headerRenderer),
                        rendererConfig: col.headerRendererConfig,
                        filterDataProvider: this,
                        filter: new TextFilter(col.dataIndex || i)
                    };
                    col.headerRenderer = this.headerRenderer;
                    col.headerRendererConfig = rendererConfig;
                    //colMap[rendererConfig.dataIdx] = rendererConfig;
                }
            },

            update: function (noUpdate) {
                var dataProvider = this.dataProvider;
                var rowCount = dataProvider.getRowCount();
                var filters = this.filters;
                var grid = this.grid;
                var index = this.index;
                var invIndex = this.invIndex,
                    idxlen = 0;

                invIndex.length = rowCount;
                for (var i = 0; i < rowCount; ++i) {
                    var pass = true;
                    for (var len = filters.length, f = 0; f < len; ++f) {
                        if (!filters[f].filter(grid, dataProvider, i)) {
                            pass = false;
                            break;
                        }
                    }
                    if (pass) {
                        invIndex[i] = idxlen;
                        index[idxlen++] = i;
                    } else{
                        invIndex[i] = -1;
                    }
                }

                index.length = idxlen;
                this.rowCount = idxlen;
//                if (!noUpdate) this.origSetTotalRowCount.call(grid, idxlen);
                if (!noUpdate) this.fireEvent('dataChanged');
            },

            addFilter: function (filter) {
                var filters = this.filters;
                var len = filters.length;

                for (var f = 0; f < len; ++f) {
                    if (filters[f] === filter) return;
                }
                filters[len] = filter;
            },

            removeFilter: function (filter) {
                var filters = this.filters;
                var len = filters.length;

                for (var f = 0; f < len; ++f) {
                    if (filters[f] === filter) {
                        filters.splice(f, 1);
                        return;
                    }
                }
            }

        });

        return FilterDataProvider;
    }
);
