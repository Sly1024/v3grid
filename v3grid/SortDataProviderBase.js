define('v3grid/SortDataProviderBase',
    ['v3grid/Adapter', 'v3grid/SortHeaderRenderer', 'v3grid/Observable'],
    function (Adapter, HeaderRenderer, Observable) {

        var SortDataProviderBase = function (config) {
            config = config || {};
            Adapter.merge(this, config);
            this.headerRenderer = this.headerRenderer || HeaderRenderer;

            if (this.dataProvider && this.dataProvider.addListener) {
                this.dataProvider.addListener('dataChanged', this.refresh, this);
            }
        };

        SortDataProviderBase.prototype = new Observable({
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
                        sortDataProvider: this,
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
                var fields = this.sortedBy.concat();
                var idx = Adapter.indexOf(fields, dataIdx);
                if (evt.ctrlKey) {
                    if (idx < 0) {
                        fields.push(dataIdx, 'asc');
                    } else {
                        fields[idx+1] = fields[idx+1] == 'asc' ? 'desc' : 'asc';
                    }
                    this.sort(fields);
                } else {
                    var dir = fields[idx+1] == 'asc' ? 'desc' : 'asc';
                    this.sort([dataIdx, dir]);
                }
            },

            updateIndicators: function (fields) {
                var colMap = this.columnMap;

                // clear sorted indicators
                var oldFields = this.sortedBy;
                for (var len = oldFields.length, i = 0; i < len; i += 2) {
                    colMap[oldFields[i]].sortOrder = null;
                }

                var flen = (fields.length+1) >> 1;
                // set new indicators
                for (var i = 0; i < flen; ++i) {
                    var colConf = colMap[fields[i << 1]];
                    colConf.sortOrder = fields[(i << 1) | 1] = fields[(i << 1) | 1] || 'asc';
                    colConf.sortIndex = i + 1;  // sortindex starts from 1
                }

                // if it's a single column -> sortIndex =0 indicates no need to display sortIndex
                if (flen == 1) colMap[fields[0]].sortIndex = 0;

                this.sortedBy = fields;
                this.grid.updateHeaders();
            },

            getCompareFunction: function (sortField) {
                var dp = this.dataProvider,
                    fields = this.sortedBy,
                    flen = fields.length,
                    cache = {};

                return function (a, b) {
                    if (sortField) {
                        a = a[sortField];
                        b = b[sortField];
                    }

                    var ca = cache[a] || (cache[a] = []);
                    var cb = cache[b] || (cache[b] = []);

                    for (var f = 0; f < flen; ++f) {
                        // fill cache if needed
                        if (ca.length <= f) ca[f] = dp.getCellData(a, fields[f << 1]);
                        if (cb.length <= f) cb[f] = dp.getCellData(b, fields[f << 1]);

                        if (ca[f] == cb[f]) continue;
                        var asc = (fields[(f << 1) | 1] == 'asc') ? -1 : 1;

                        // undef is nor less neither greater than any number: undef < 5 === false; undef > 5 === false
                        // if cb[f] === undef -> it's ok, because the comparison (ca[f] < undef) returns false,
                        // which means undef is less than the other (non-undef) value, and this is how I want it to work
                        if (ca[f] === undefined) return asc;

                        return (ca[f] < cb[f]) ? asc : -asc;
                    }
                    // if all fields are equal, we sort based on original node index
                    return a < b ? -1 : a > b ? 1 : 0;
                };
            }

        });

        return SortDataProviderBase;
    }
);
