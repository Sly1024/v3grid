define('v3grid/ColumnManager',
    ['v3grid/Adapter', 'v3grid/Utils', 'v3grid/ColumnRange'],
    function (Adapter, Utils, Range) {

        var Manager = function (grid, configs) {
            this.grid = grid;
            this.sheet = grid.styleSheet;
            this.lastColId = 0;
            this.columns = Adapter.arrayMap(configs, this.processConfig, this);
            this.ranges = [];
            this.rangeStart = [0];

            this.validateColumnWidths();
            // call super ctor
            Range.call(this, this.columns);

            // for now
            this.columnsChanged = true;
        };

        Manager.prototype = Adapter.merge(Adapter.merge({}, Range.prototype), {
            processConfig: function (config) {
                var col = Adapter.merge({}, config),  //clone col
                    idx = this.lastColId++,
                    num = this.grid.instanceNum,
                    sheet = this.sheet,
                    ruleIdxs = col.ruleIdxs = [],
                    clsName,
                    finalCls = [],
                    finalHeaderCls = [];

                // user specified cls/headerCls
                if (col.cls) finalCls.push(col.cls);
                if (col.headerCls) finalHeaderCls.push(col.headerCls);

                // user specified style/headerStyle
                if (col.style) {
                    clsName = 'v3grid-'+num+'-column'+idx+'-user';
                    ruleIdxs.push(Adapter.insertCSSRule(sheet, '.'+clsName, Utils.styleEncode(col.style)));
                    finalCls.push(clsName);
                }

                if (col.headerStyle) {
                    clsName = 'v3grid-'+num+'-header-'+idx+'-user';
                    ruleIdxs.push(Adapter.insertCSSRule(sheet, '.'+clsName, Utils.styleEncode(col.headerStyle)));
                    finalHeaderCls.push(clsName);
                }

                // generated layout classes
                clsName = 'v3grid-'+num+'-column'+idx+'-layout';
                finalCls.push(col.layoutCls = clsName);
                finalHeaderCls.push(clsName);
                var ruleIdx = Adapter.insertCSSRule(sheet, '.'+clsName, '');
                col.layoutRule = Adapter.getCSSRule(sheet, ruleIdx);
                ruleIdxs.push(ruleIdx);

                col.finalCls = finalCls.join(' ');
                col.finalHeaderCls = finalHeaderCls.join(' ');

                return col;
            },

            validateColumnWidths: function () {
                var columns = this.columns,
                    flexCount = 0;

                for (var len = columns.length, i = 0; i < len; ++i) {
                    var col = columns[i], cw = col.width,
                        width = NaN, flex = 0;

                    switch (typeof cw) {
                        case 'number': width = cw; break;
                        case 'string':
                            width = parseFloat(cw);
                            if (cw[cw.length-1] == '*') { flex = width; width = NaN; }
                            break;
                    }

                    col.width = width;
                    col.flex = flex;
                    if (!isNaN(width)) col.actWidth = width;
                    if (flex) ++flexCount;
                }

                this.flexColumnCount = flexCount;
            },

            calcColumnWidths: function (avail) {
                if (this.flexColumnCount == 0) return false;

                var columns = this.columns,
                    fixTotal = 0, fixMin = 0,
                    flexTotal = 0, flexMin = 0,
                    count = columns.length,
                    flexCols = [], i,
                    changed = false;

                for (i = 0; i < count; ++i) {
                    var col = columns[i];
                    if (!col.visible) {
                        if (col.actWidth != 0) changed = true;
                        col.actWidth = 0;
                        continue;
                    }
                    if (col.flex) {
                        flexMin += col.minWidth;
                        flexTotal += col.flex;
                        flexCols.push(col);
                    } else {
                        if (col.actWidth != col.width) {
                            col.actWidth = col.width;
                            changed = true;
                        }
                        fixMin += col.minWidth;
                        fixTotal += col.actWidth;
                    }
                }

                var flexAvail = avail - fixTotal;
                count = flexCols.length;
                if (count) {
                    flexCols.sort(function (a, b) { return a.flex / a.minWidth - b.flex / b.minWidth;});
                    for (i = 0; i < count; ++i) {
                        col = flexCols[i];
                        var w = flexAvail * col.flex / flexTotal,
                            mw = col.minWidth, act;
                        if (w < mw) {
                            act = mw;
                            flexAvail -= mw;
                            flexTotal -= col.flex;
                        } else {
                            act = w;
                        }

                        if (col.actWidth != act) {
                            col.actWidth = act;
                            changed = true;
                        }
                    }
                }

                // TODO: fire event instead ?
                if (changed) {
                    this.columnsChanged = true;
                    this.calcPosX();
//                    this.applyColumnStyles();
                }

                return changed;
            },

            // both inclusive (normal: 0, total-1)
            applyColumnStyles: function (from, to) {
                var columns = this.columns,
                    columnsX = this.posX;

                from = from || 0;
                if (to === undefined) to = columns.length-1;

                for (var dc = from; dc <= to; ++dc) {
                    var col = columns[dc];
                    Adapter.setXCSS(col.layoutRule, columnsX[dc]);
                    col.layoutRule.style.width = col.actWidth + 'px';
                }
            },

            // public
            getRanges: function (counts) {
                var len = counts.length,
                    ranges = this.ranges = new Array(len),
                    rangeStart = this.rangeStart = new Array(len+1),
                    columns = this.columns,
                    idx = 0, end;

                for (var i = 0; i < len; ++i) {
                    rangeStart[i] = idx;
                    end = idx + counts[i];
                    ranges[i] = new Range(columns.slice(idx, end));
                    ranges[i].addListener('columnMoved', this.createColumnMoveHandler(i), this);
                    idx = end;
                }
                rangeStart[len] = idx;

                return ranges;
            },

            createColumnMoveHandler: function (rangeIdx) {
                return function (fromIdx, toIdx) {
                    var offset = this.rangeStart[rangeIdx];
                    this.moveColumn(fromIdx + offset, toIdx + offset);
                }
            },

            getRangeIdx: function (columnIdx) {
                var rangeStart = this.rangeStart;
                for (var len = this.ranges.length, i = -1; i < len; ++i) {
                    if (columnIdx < rangeStart[i+1]) {
                        return i;
                    }
                }
                return -1;
            },

            addColumn: function (idx, config, suppressEvent) {
                var ranges = this.ranges,
                    rangeStart = this.rangeStart,
                    col = this.processConfig(config);

                // call super
                Range.prototype.addColumn.call(this, idx, col, true);

                for (var len = ranges.length, i = 0; i < len; ++i) {
                    if (idx >= rangeStart[i] && idx < rangeStart[i+1]) {
                        ranges[i].addColumn(idx - rangeStart[i], col);
                    }
                    if (idx < rangeStart[i+1]) ++rangeStart[i+1];
                }

                if (!suppressEvent) this.fireEvent('columnAdded', idx, col);
            },

            removeColumn: function (idx, suppressEvent) {
                var ranges = this.ranges,
                    rangeStart = this.rangeStart,
                    col = this.columns[idx],
                    len, i;

                for (len = col.ruleIdxs.length, i = 0; i < len; ++i) {
                    Adapter.removeCSSRule(col.ruleIdxs[i]);
                }

                // call super
                Range.prototype.removeColumn.call(this, idx, true);

                for (len = ranges.length, i = 0; i < len; ++i) {
                    if (idx >= rangeStart[i] && idx < rangeStart[i+1]) {
                        ranges[i].removeColumn(idx - rangeStart[i]);
                    }
                    if (idx < rangeStart[i+1]) --rangeStart[i+1];
                }

                if (!suppressEvent) this.fireEvent('columnRemoved', idx, col);
            },

            moveColumn: function (fromIdx, toIdx, suppressEvent) {
                Range.prototype.moveColumn.call(this, fromIdx, toIdx, true);

                var fromRange = this.getRangeIdx(fromIdx),
                    toRange = this.getRangeIdx(toIdx),
                    rangeStart = this.rangeStart,
                    ranges = this.ranges;

                if (fromRange != -1 && toRange != -1) {
                    if (fromRange == toRange) {
                        var offset = rangeStart[toRange];
                        ranges[toRange].moveColumn(fromIdx - offset, toIdx - offset);
                    } else {
                        ranges[fromRange].removeColumn(fromIdx - rangeStart[fromRange]);
                        ranges[toRange].addColumn(toIdx - rangeStart[toRange], true);
                        // modify rangeStart[]
                        for (var i = fromRange + 1; i <= toRange; ++i) --rangeStart[i];
                    }
                }

                if (!suppressEvent) this.fireEvent('columnMoved', fromIdx, toIdx);
            }
        });

        return Manager;
    }
);