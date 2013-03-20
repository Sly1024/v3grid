define('v3grid/FilterDataProvider',
    ['v3grid/Adapter', 'v3grid/InlineFilterHeaderRenderer', 'v3grid/TextFilter', 'v3grid/Observable'],
    function (Adapter, HeaderRenderer, TextFilter, Observable) {

        var FilterDataProvider = function (config) {
            config = config || {};
            config.headerRenderer = config.headerRenderer || HeaderRenderer;
            this.filters = [];
            Adapter.merge(this, config);

            if (this.dataProvider.addListener) {
                this.dataProvider.addListener('dataChanged', this.refresh, this);
            }
        };

        FilterDataProvider.prototype = new Observable({
            init: function (grid, config) {
                this.index = [];
                var invIndex = this.invIndex = [];
                invIndex[-1] = -1;

                this.update(true);
            },

            initRev: function (grid, config) {
                this.processColumnRenderers(grid, config.columns);
                config.headerHeight = (config.headerHeight || grid.headerHeight) + 20;
            },

            /* DataProvider API - start */
            getRowCount: function () {
                return this.index.length;
            },

            getRowId: function (row) {
                return this.dataProvider.getRowId(this.index[row]);
            },

            getCellData: function (row, col) {
                return this.dataProvider.getCellData(this.index[row], col);
            },

            refresh: function () {
                this.update();
                this.fireEvent('dataChanged');
            },
            /* DataProvider API - end */

            processColumnRenderers: function (grid, columns) {
                //var colMap = this.columnMap = {};

                for (var len = columns.length, i = 0; i < len; ++i) {
                    var col = columns[i];
                    var rendererConfig = {
                        renderer: grid.getRenderer(col.headerRenderer || grid.headerRenderer),
                        rendererConfig: col.headerRendererConfig,
                        filterDataProvider: this,
                        filter: new TextFilter(col.dataIndex == null ? i : col.dataIndex)
                    };
                    col.headerRenderer = this.headerRenderer;
                    col.headerRendererConfig = rendererConfig;
                    //colMap[rendererConfig.dataIdx] = rendererConfig;
                }
            },

            update: function (noUpdate) {
                var dataProvider = this.dataProvider,
                    rowCount = dataProvider.getRowCount(),
                    filters = this.filters,
                    index = this.index,
                    invIndex = this.invIndex,
                    idxlen = 0;

                invIndex.length = rowCount;
                for (var i = 0; i < rowCount; ++i) {
                    var pass = true;
                    for (var len = filters.length, f = 0; f < len; ++f) {
                        if (!filters[f].filter(dataProvider, i)) {
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
