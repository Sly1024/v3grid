ClassDef('v3grid.WrapperRenderer', {

    updateRenderer: function (config) {
        this.renderer = config.grid.rendererCache.swap(this.rendererContainer, this.renderer,
            config.renderer, config.rendererConfig);
    },

    updateData: function (grid, row, col) {
        this.renderer.updateData(grid, row, col);
    },

    setConfig: function (config) {
        if (config.renderer != this.config.renderer || config.rendererConfig != this.config.rendererConfig) {
            this.updateRenderer(config);
        }
        this.config = config;
    }

});