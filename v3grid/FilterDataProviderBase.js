define('v3grid/FilterDataProviderBase',
    ['v3grid/Adapter', 'v3grid/InlineFilterHeaderRenderer', 'v3grid/TextFilter', 'v3grid/Observable'],
    function (Adapter, HeaderRenderer, TextFilter, Observable) {

        var FilterDataProviderBase = function (config) {
            config = config || {};
            this.filters = [];
            Adapter.merge(this, config);
            this.headerRenderer = this.headerRenderer || HeaderRenderer;

            if (this.dataProvider && this.dataProvider.addListener) {
                this.dataProvider.addListener('dataChanged', this.refresh, this);
            }
        };

        FilterDataProviderBase.prototype = new Observable({
            initRev: function (grid, config) {
                this.processColumnRenderers(grid, config.columns);
                config.headerHeight = (config.headerHeight || grid.headerHeight) + 20;
            },

            refresh: function () {
                this.update();
                this.fireEvent('dataChanged');
            },

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

        return FilterDataProviderBase;
    }
);
