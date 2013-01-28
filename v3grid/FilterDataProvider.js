define('v3grid/FilterDataProvider',
    ['v3grid/Adapter', 'v3grid/InlineFilterHeaderRenderer', 'v3grid/TextFilter'],
    function (Adapter, HeaderRenderer, TextFilter) {

        var FilterDataProvider = function (config) {
            config = config || {};
            config.headerRenderer = config.headerRenderer || HeaderRenderer;
            this.filters = [];
            Adapter.merge(this, config);
        };

        FilterDataProvider.prototype = {
            init: function (grid, config) {
                this.grid = grid;

                var origGetData = this.origGetData = config.getData;

                var index = this.index = new Array();
                this.invIndex = new Array(config.totalRowCount);

                this.totalRowCount = config.totalRowCount;

                config.getData = function (row, col) {
                    return origGetData.call(grid, index[row], col);
                };


                this.update(true);
                config.totalRowCount = index.length;
            },

            initRev: function (grid, config) {
                this.processColumnRenderers(config.columns);

                config.headerHeight = (config.headerHeight || grid.headerHeight) + 20;
                this.origSetTotalRowCount = config.setTotalRowCount || grid.setTotalRowCount;
                var origInvData = config.invalidateData || grid.invalidateData;
                var me = this;

                config.setTotalRowCount = function (rowCount) {
                    me.totalRowCount = rowCount;
                    me.update();
                };
                config.invalidateData = function (row, col) {
                    row = me.invIndex[row];
                    if (row >= 0) origInvData.call(grid, row, col);
                };
                config.updateView = function () {
                    me.update();
                };
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
                        filter: new TextFilter(col.dataIndex)
                    };
                    col.headerRenderer = this.headerRenderer;
                    col.headerRendererConfig = rendererConfig;
                    //colMap[rendererConfig.dataIdx] = rendererConfig;
                }
            },

            update: function (noUpdate) {
                var rowCount = this.totalRowCount;
                var filters = this.filters;
                var grid = this.grid;
                var origGetData = this.origGetData;
                var index = this.index;
                var invIndex = this.invIndex,
                    idxlen = 0;

                invIndex.length = rowCount;
                for (var i = 0; i < rowCount; ++i) {
                    var pass = true;
                    for (var len = filters.length, f = 0; f < len; ++f) {
                        if (!filters[f].filter(grid, origGetData, i)) {
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
                if (!noUpdate) this.origSetTotalRowCount.call(grid, idxlen);
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

        };

        return FilterDataProvider;
    }
);
