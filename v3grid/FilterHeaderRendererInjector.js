define('v3grid/FilterHeaderRendererInjector',
    ['v3grid/Adapter', 'v3grid/TextFilter', 'v3grid/InlineFilterHeaderRenderer'],
    function (Adapter, TextFilter, InlineFilterHeaderRenderer) {

        var FilterHeaderRendererInjector = function (filterDataProvider, renderer) {
            this.filterDataProvider = filterDataProvider;
            this.headerRenderer = renderer || InlineFilterHeaderRenderer;
        };

        FilterHeaderRendererInjector.prototype = {
            initRev: function (grid, config) {
                this.processColumnRenderers(grid, config.columns);
                config.headerHeight = (config.headerHeight || grid.headerHeight) + 20;
            },
            processColumnRenderers: function (grid, columns) {
                for (var len = columns.length, i = 0; i < len; ++i) {
                    var col = columns[i];
                    var rendererConfig = {
                        renderer: grid.getRenderer(col.headerRenderer || grid.headerRenderer),
                        rendererConfig: col.headerRendererConfig,
                        filterDataProvider: this.filterDataProvider,
                        filter: new TextFilter(col.dataIndex == null ? i : col.dataIndex)
                    };
                    col.headerRenderer = this.headerRenderer;
                    col.headerRendererConfig = rendererConfig;
                }
            }

        };

        return FilterHeaderRendererInjector;
    }
);