define('v3grid/SortHeaderRendererInjector',
    ['v3grid/Adapter', 'v3grid/SortHeaderRenderer'],
    function (Adapter, SortHeaderRenderer) {

        var SortHeaderRendererInjector = function (sortDataProvider, renderer) {
            this.sortDataProvider = sortDataProvider;
            this.headerRenderer = renderer || SortHeaderRenderer;

            if (sortDataProvider && sortDataProvider.addListener) {
                sortDataProvider.addListener('sortChanged', this.updateIndicators, this);
            }

            this.columnMap = {};
        };

        SortHeaderRendererInjector.prototype = {
            init: function (grid, config) {
                this.grid = grid;
                grid.registerColumnConfigPreprocessor(Adapter.bindScope(this.processColumnRenderer, this), 0);
            },

            processColumnRenderer: function (column) {
                var rendererConfig = {
                    renderer: this.grid.getRenderer(column.headerRenderer || this.grid.headerRenderer),
                    rendererConfig: column.headerRendererConfig,
                    sortHeaderRendererInjector: this,
                    column: column,
                    sortOrder: null
                };
                column.headerRenderer = this.headerRenderer;
                column.headerRendererConfig = rendererConfig;
                this.columnMap[column.dataIndex] = rendererConfig;
                return column;
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

                if (!colMap || !this.grid) return;

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