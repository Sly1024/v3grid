ClassDef('v3grid.GroupHeaderRenderer', {
    requires: ['v3grid.Utils'],

    ctor: function GroupHeaderRenderer() {
        this.view = document.createElement('div');
    },

    updateData: function (grid, row, column) {
        this.grid = grid;
        if (column !== this.renderedColumn) {
            this.rebuild(column);
        }
    },

    rebuild: function (column) {
        var view = this.view, grid = this.grid, thisClass = this.ctor;

        while (view.firstChild) view.removeChild(view.firstChild);

        v3grid.Utils.walkTree([column], function (col, idx, arr, parent, depth) {
            var div = document.createElement('div');

            div.style.position = 'absolute';
            div.style.top = (depth * grid.grid.headerRowHeight) + 'px';
            div.style.left = col.left + 'px';
            div.style.width = col.actWidth + 'px';
            div.style.height = grid.grid.headerRowHeight + 'px';
            div.className = 'v3grid-header-cell';
            view.appendChild(div);

//            var rendererType = col.headerRenderer === thisClass ? v3grid.DefaultHeaderRenderer : col.headerRenderer;

            var rend = col.actRenderer = grid.rendererCache.swap(div, col.actRenderer, col.headerRenderer, col.headerRendererConfig);
            rend.setData(col.header);
        });

        this.renderedColumn = column;
    }
});
