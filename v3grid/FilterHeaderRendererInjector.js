define('v3grid/FilterHeaderRendererInjector',
    ['v3grid/Adapter', 'v3grid/TextFilter', 'v3grid/InlineFilterHeaderRenderer'],
    function (Adapter, TextFilter, InlineFilterHeaderRenderer) {

        var FilterHeaderRendererInjector = function (filterDataProvider, renderer) {
            this.filterDataProvider = filterDataProvider;
            this.headerRenderer = renderer || InlineFilterHeaderRenderer;
        };

        FilterHeaderRendererInjector.prototype = {
            init: function (grid, config) {
                this.grid = grid;
                config.headerHeight = (config.headerHeight || grid.headerHeight) + 20;
                grid.registerColumnConfigPreprocessor(Adapter.bindScope(this.processColumnRenderer, this));
            },
            processColumnRenderer: function (column) {
                var rendererConfig = {
                    renderer: this.grid.getRenderer(column.headerRenderer || this.grid.headerRenderer),
                    rendererConfig: column.headerRendererConfig,
                    filterDataProvider: this.filterDataProvider,
                    filter: new TextFilter(column.dataIndex)
                };
                column.headerRenderer = this.headerRenderer;
                column.headerRendererConfig = rendererConfig;
                return column;
            }

        };

        return FilterHeaderRendererInjector;
    }
);