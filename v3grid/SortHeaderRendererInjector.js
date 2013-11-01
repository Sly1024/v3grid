ClassDef('v3grid.SortHeaderRendererInjector', {
    requires: ['v3grid.SortHeaderRenderer'],

    ctor: function SortHeaderRendererInjector(sortDataProvider, renderer) {
        this.sortDataProvider = sortDataProvider;
        this.headerRenderer = renderer || v3grid.SortHeaderRenderer;

        if (sortDataProvider && sortDataProvider.addListener) {
            sortDataProvider.addListener('sortChanged', this.updateIndicators, this);
        }
    },

    init: function (grid, config) {
        this.grid = grid;
        grid.registerColumnConfigPreprocessor(v3grid.Adapter.bindScope(this.processColumnRenderer, this), 0);
    },

    processColumnRenderer: function (column) {
        var rendererConfig = {
            grid: this.grid,
            renderer: v3grid.Adapter.getClass(column.headerRenderer || this.grid.headerRenderer),
            rendererConfig: column.headerRendererConfig,
            sortHeaderRendererInjector: this
        };
        column.headerRenderer = this.headerRenderer;
        column.headerRendererConfig = rendererConfig;
        return column;
    },

    columnClicked: function(dataIdx, evt) {
        var sortDataProvider = this.sortDataProvider;
        var fields = sortDataProvider.sortedBy.concat();
        var idx = v3grid.Adapter.indexOf(fields, dataIdx);
        if (evt.ctrlKey) {
            if (idx < 0) {
                fields.push(dataIdx, 'asc');
            } else {
                fields[idx+1] = fields[idx+1] == 'asc' ? 'desc' : 'asc';
            }
            sortDataProvider.sort(fields);
        } else {
            var dir = fields[idx+1] == 'asc' ? 'desc' : 'asc';
            sortDataProvider.sort([dataIdx, dir]);
        }
    },

    setSortInfoOnColumns: function (indices, sortOrder, sortIndex) {
        if (indices) {
            var columns = this.grid.colMgr.columns;
            v3grid.Adapter.arrayEach(indices, function (idx) {
                columns[idx].sortOrder = sortOrder;
                columns[idx].sortIndex = sortIndex;
            });
        }
    },

    updateIndicators: function (fields, oldFields) {
        if (!this.grid) return;

        var colMap = this.grid.colMgr.colDataIdx2Idxs;

        // clear sorted indicators
        for (var len = oldFields.length, i = 0; i < len; i += 2) {
            this.setSortInfoOnColumns(colMap[oldFields[i]], null, 0);
        }

        var flen = (fields.length+1) >> 1;
        // set new indicators
        for (i = 0; i < flen; ++i) {
            this.setSortInfoOnColumns(colMap[fields[i << 1]],
                fields[(i << 1) | 1] = fields[(i << 1) | 1] || 'asc',
                // sortindex starts from 1
                // if it's a single column -> sortIndex =0 indicates no need to display sortIndex
                flen == 1 ? 0 : i + 1);
        }

        this.grid.updateHeaders();
    }
});