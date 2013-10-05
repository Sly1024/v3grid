define('v3grid/SortHeaderRendererInjector',
    ['v3grid/Adapter', 'v3grid/SortHeaderRenderer'],
    function (Adapter, SortHeaderRenderer) {

        var SortHeaderRendererInjector = function (sortDataProvider, renderer) {
            this.sortDataProvider = sortDataProvider;
            this.headerRenderer = renderer || SortHeaderRenderer;

            if (sortDataProvider && sortDataProvider.addListener) {
                sortDataProvider.addListener('sortChanged', this.updateIndicators, this);
            }
        };

        SortHeaderRendererInjector.prototype = {
            init: function (grid, config) {
                this.grid = grid;
                this.processColumnRenderers(grid, config.columns);
            },

            processColumnRenderers: function (grid, columns) {
                var colMap = this.columnMap = {};

                for (var len = columns.length, i = 0; i < len; ++i) {
                    var col = columns[i];
                    var rendererConfig = {
                        renderer: grid.getRenderer(col.headerRenderer || grid.headerRenderer),
                        rendererConfig: col.headerRendererConfig,
                        sortHeaderRendererInjector: this,
                        dataIdx: col.dataIndex == null ? i : col.dataIndex,
                        column: col,
                        sortOrder: null
                    };
                    col.headerRenderer = this.headerRenderer;
                    col.headerRendererConfig = rendererConfig;
                    colMap[rendererConfig.dataIdx] = rendererConfig;
                }
            },

            columnClicked: function(dataIdx, evt) {
                var sortDataProvider = this.sortDataProvider;
                var fields = sortDataProvider.sortedBy.concat();
                var idx = Adapter.indexOf(fields, dataIdx);
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

            updateIndicators: function (fields, oldFields) {
                var colMap = this.columnMap;

                // clear sorted indicators
                for (var len = oldFields.length, i = 0; i < len; i += 2) {
                    colMap[oldFields[i]].sortOrder = null;
                }

                var flen = (fields.length+1) >> 1;
                // set new indicators
                for (i = 0; i < flen; ++i) {
                    var colConf = colMap[fields[i << 1]];
                    colConf.sortOrder = fields[(i << 1) | 1] = fields[(i << 1) | 1] || 'asc';
                    colConf.sortIndex = i + 1;  // sortindex starts from 1
                }

                // if it's a single column -> sortIndex =0 indicates no need to display sortIndex
                if (flen == 1) colMap[fields[0]].sortIndex = 0;

                this.grid.updateHeaders();
            }

        };

        return SortHeaderRendererInjector;
    }
);