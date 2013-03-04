define('v3grid/SortDataProvider',
    ['v3grid/Adapter', 'v3grid/SortHeaderRenderer'],
    function (Adapter, HeaderRenderer) {

        var SortDataProvider = function (config) {
            config = config || {};
            config.headerRenderer = config.headerRenderer || HeaderRenderer;
            Adapter.merge(this, config);
        };

        SortDataProvider.prototype = {
            init: function (grid, config) {
                this.grid = grid;
                this.processColumnRenderers(config.columns);

                var origGetData = this.origGetData = config.getData;
                var origGetVisibleRowIdx = config.getVisibleRowIdx || grid.getVisibleRowIdx;

                var index = this.index = new Array(config.totalRowCount);
                var invIndex = this.invIndex = new Array(config.totalRowCount);
                invIndex[-1] = -1;

                this.totalRowCount = config.totalRowCount;

                config.getData = function (row, col) {
                    return origGetData.call(grid, index[row], col);
                };

                config.getVisibleRowIdx = function (row) {
                    return invIndex[origGetVisibleRowIdx.call(grid, row)];
                };


                // check if a TreeDP is present
                if (require.defined('v3grid/TreeDataProvider')) {
                    var treeDP = require('v3grid/TreeDataProvider');
                    var features = config.features;
                    for (var len = features.length, i = 0; i < len; ++i) {
                        var feat = features[i];
                        if (feat instanceof treeDP) {
                            this.treeDataProvider = feat;
                        }
                    }
                }

                this.sortedBy = [];
                this.unSort(true);
            },

            initRev: function (grid, config) {
                var origSetTotalRowCount = config.setTotalRowCount || grid.setTotalRowCount;
                var origInvData = config.invalidateData || grid.invalidateData;
                var origUpdateView = this.origUpdateView = config.updateView || grid.updateView;
                var origGetDataRowIdx = config.getDataRowIdx || grid.getDataRowIdx;
                var me = this, index = this.index, invIndex = this.invIndex;

                config.getDataRowIdx = function (row) {
                    return index[origGetDataRowIdx.call(grid, row)];
                };

                config.setTotalRowCount = function (rowCount) {
                    me.totalRowCount = rowCount;
                    var sortFields = me.sortedBy;
                    me.unSort(true);
                    me.sort(sortFields, true);
                    origSetTotalRowCount.call(grid, rowCount);
                };
                config.invalidateData = function (row, col) {
                    origInvData.call(grid, invIndex[row], col);
                };
                config.updateView = function () {
                    me.sort(me.sortedBy, true);
                    origUpdateView.call(grid);
                };
            },

            processColumnRenderers: function (columns) {
                var grid = this.grid;
                var colMap = this.columnMap = {};

                for (var len = columns.length, i = 0; i < len; ++i) {
                    var col = columns[i];
                    var rendererConfig = {
                        renderer: grid.getRenderer(col.headerRenderer || grid.headerRenderer),
                        rendererConfig: col.headerRendererConfig,
                        sortDataProvider: this,
                        dataIdx: col.dataIndex || i,
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
            },

            sort: function (fields, noUpdate) {
                if (!noUpdate) this.updateIndicators(fields);

                var flen = fields.length >> 1;

                var grid = this.grid;
                var getData = this.origGetData;

                var i;
                var len = this.totalRowCount;
                var cache = new Array(len);
                for (i = 0; i < len; ++i) cache[i] = [];

                var index = this.index;
                var tdp = this.treeDataProvider;

                function compare(a, b) {
                    var ca = cache[a];
                    var cb = cache[b];

                    for (var f = 0; f < flen; ++f) {
                        // fill cache if needed
                        if (ca.length <= f) ca[f] = getData.call(grid, a, fields[f << 1]);
                        if (cb.length <= f) cb[f] = getData.call(grid, b, fields[f << 1]);

                        if (ca[f] == cb[f]) continue;
                        var asc = (fields[(f << 1) | 1] == 'asc') ? -1 : 1;

                        // undef is nor less neither greater than any number: undef < 5 === false; undef > 5 === false
                        // if cb[f] === undef -> it's ok, because the comparison (ca[f] < undef) returns false,
                        // which means undef is less than the other (non-undef) value, and this is how I want it to work
                        if (ca[f] === undefined) return asc;

                        return (ca[f] < cb[f]) ? asc : -asc;
                    }

                    // if all fields are equal, we sort based on original row index
                    return a - b;
                }

                var mapper = tdp ? tdp.mapper : null;

                function treeCompare(a, b) {
                    var atidx = mapper.getTreeIdx(a);
                    var btidx = mapper.getTreeIdx(b);
                    var alen = atidx.length, blen = btidx.length;

                    var i = 0;
                    while (i < alen && i < blen && atidx[i] == btidx[i]) ++i;

                    if (i < alen && i < blen) {
                        // truncate tree indices
                        atidx.length = btidx.length = i + 1;
                        return compare(mapper.getLinearIdx(atidx), mapper.getLinearIdx(btidx));
                    } else {
                        return alen - blen;
                    }
                }

                index.sort(tdp ? treeCompare : compare);

                // update inv. index
                var invIndex = this.invIndex;
                for (i = 0; i < len; ++i) invIndex[index[i]] = i;

                if (!noUpdate) this.origUpdateView.call(grid);
            },

            unSort: function (noUpdate) {
                if (!noUpdate) this.updateIndicators([]);

                var rowCount = this.totalRowCount;
                var index = this.index;
                var invIndex = this.invIndex;
                index.length = invIndex.length = rowCount;
                for (var i = 0; i < rowCount; ++i) invIndex[i] = index[i] = i;

                if (!noUpdate) this.origUpdateView.call(this.grid);
            }

        };

        return SortDataProvider;
    }
);
