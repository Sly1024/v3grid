ClassDefReq('v3grid.GroupHeaderRenderer', {
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
        var view = this.view, grid = this.grid;

        while (view.firstChild) view.removeChild(view.firstChild);

        v3grid.Utils.walkTree([column], function (item, idx, arr, parent, depth) {
            var div = document.createElement('div');
            div.innerHTML = item.header;
            div.style.position = 'absolute';
            div.style.top = (depth * grid.grid.headerRowHeight) + 'px';
            div.style.left = item.left + 'px';
            div.style.width = item.actWidth + 'px';
            div.style.height = grid.grid.headerRowHeight + 'px';
            div.className = 'v3grid-header-cell';
            view.appendChild(div);
        });

        this.renderedColumn = column;
    }
});
