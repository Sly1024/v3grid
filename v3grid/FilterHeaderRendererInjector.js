ClassDefReq('v3grid.FilterHeaderRendererInjector', {
    requires: ['v3grid.TextFilter', 'v3grid.InlineFilterHeaderRenderer'],

    ctor: function FilterHeaderRendererInjector(filterDataProvider, renderer) {
        this.filterDataProvider = filterDataProvider;
        this.headerRenderer = renderer || v3grid.InlineFilterHeaderRenderer;
    },

    init: function (grid, config) {
        this.grid = grid;
        config.headerHeight = (config.headerHeight || grid.headerHeight) + 20;
        grid.registerColumnConfigPreprocessor(v3grid.Adapter.bindScope(this.processColumnRenderer, this));
    },

    processColumnRenderer: function (column) {
        var rendererConfig = {
            renderer: this.grid.getRenderer(column.headerRenderer || this.grid.headerRenderer),
            rendererConfig: column.headerRendererConfig,
            filterDataProvider: this.filterDataProvider,
            filter: new v3grid.TextFilter(column.dataIndex)
        };
        column.headerRenderer = this.headerRenderer;
        column.headerRendererConfig = rendererConfig;
        return column;
    }

});