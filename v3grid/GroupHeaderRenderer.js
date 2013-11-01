ClassDef('v3grid.GroupHeaderRenderer', {
    requires: ['v3grid.Adapter', 'v3grid.Utils', 'v3grid.DOMCache'],

    ctor: function GroupHeaderRenderer() {
        this.view = document.createElement('div');
        this.cells = [];
        this.cache = new v3grid.DOMCache({
            parentDom: this.view,
            create: this.cache_create
        });
    },

    cache_create: function () {
        var div = document.createElement('div');
        div.style.position = 'absolute';
        div.className = 'v3grid-header-cell';
        return { dom: div };
    },

    updateData: function (grid, row, column) {
        this.grid = grid;
        if (column !== this.renderedColumn) {
            this.rebuild(column);
        }
        this.updateCells();
    },

    rebuild: function (column) {
        var grid = this.grid,
            cells = this.cells,
            cache = this.cache;

        v3grid.Adapter.arrayEach(cells, cache.release, cache);
        cells.length = 0;

        v3grid.Utils.walkTree([column], function (col/*, idx, arr, parent, depth*/) {
            var cell = cache.get();
            cell.col = col;
            cell.renderer = grid.rendererCache.swap(cell.dom, cell.renderer, col.headerRenderer, col.headerRendererConfig);
            cells.push(cell);
        });

        cache.validate();

        this.renderedColumn = column;
    },

    updateCells: function () {
        var grid = this.grid,
            rowHeight = grid.grid.headerHeight / (this.renderedColumn.maxDepth + 1);

        v3grid.Adapter.arrayEach(this.cells, function (cell) {
            var divStyle = cell.dom.style, col = cell.col;
            divStyle.top = (col.depth * rowHeight) + 'px';
            divStyle.left = col.left + 'px';
            divStyle.width = col.actWidth + 'px';
            divStyle.height = rowHeight + 'px';

            var renderer = cell.renderer;
            renderer.updateData(grid, 0, col);
            if (renderer.setConfig) renderer.setConfig(col.headerRendererConfig);
        });
    }
});
