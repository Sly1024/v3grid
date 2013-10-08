define('v3grid/ColumnManager',
    ['v3grid/Adapter', 'v3grid/Utils', 'v3grid/ColumnRange'],
    function (Adapter, Utils, Range) {

        var ColumnManager = function (grid, configs) {
            this.grid = grid;
            this.sheet = grid.styleSheet;
            this.lastColId = 0;
            this.ranges = [];
            this.rangeStart = [0];

            for (var len = configs.length, i = 0; i < len; ++i) configs[i] = this.processConfig(configs[i]);

            // call super ctor
            Range.call(this, configs);

            // this forces calcColumnWidths to update the first time
            this.flexColumnCount = -1;
        };

        var base = Range.prototype;

        ColumnManager.prototype = Adapter.merge(Adapter.merge({}, base), {
            processConfig: function (config) {
                var col = Adapter.merge({}, config),  //clone col
                    idx = this.lastColId++,
                    num = this.grid.instanceNum,
                    sheet = this.sheet,
                    rules = col.cssRules = [],
                    clsName,
                    finalCls = [],
                    finalHeaderCls = [];

                // user specified cls/headerCls
                if (col.cls) finalCls.push(col.cls);
                if (col.headerCls) finalHeaderCls.push(col.headerCls);

                // user specified style/headerStyle
                if (col.style) {
                    clsName = 'v3grid-'+num+'-column'+idx+'-user';
                    rules.push(Adapter.insertCSSRule(sheet, '.'+clsName, Utils.styleEncode(col.style)));
                    finalCls.push(clsName);
                }

                if (col.headerStyle) {
                    clsName = 'v3grid-'+num+'-header-'+idx+'-user';
                    rules.push(Adapter.insertCSSRule(sheet, '.'+clsName, Utils.styleEncode(col.headerStyle)));
                    finalHeaderCls.push(clsName);
                }

                // generated layout classes
                clsName = 'v3grid-'+num+'-column'+idx+'-layout';
                finalCls.push(col.layoutCls = clsName);
                finalHeaderCls.push(clsName);
                rules.push(col.layoutRule = Adapter.insertCSSRule(sheet, '.'+clsName, ''));

                col.finalCls = finalCls.join(' ');
                col.finalHeaderCls = finalHeaderCls.join(' ');

                // validate width
                var cw = col.width, width = NaN, flex = 0;

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

                return col;
            },

            calcColumnWidths: function (avail) {
                if (this.flexColumnCount == 0) return false;

                var columns = this.columns,
                    fixTotal = 0, fixMin = 0,
                    flexTotal = 0, flexMin = 0,
                    count = columns.length,
                    flexCols = [], i,
                    changed = this.flexColumnCount == -1;

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
                        fixMin += col.minWidth;
                        fixTotal += col.actWidth;
                    }
                }

                var flexAvail = avail - fixTotal;
                this.flexColumnCount = count = flexCols.length;
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
                    this.calcPosX();
                    this.applyColumnStyles();
                }

                return changed;
            },

            // both inclusive (normal: 0, total-1)
            applyColumnStyles: function (from, to) {
                from = from || 0;
                if (to === undefined) to = this.columns.length-1;

                var ranges = this.ranges;
                if (ranges.length) {
                    var fromRng = this.getRangeIdx(from),
                        toRng = this.getRangeIdx(to),
                        rangeStart = this.rangeStart;

                    if (fromRng == toRng) {
                        var offset = rangeStart[toRng];
                        ranges[toRng].applyColumnStyles(from - offset, to - offset);
                    } else {
                        ranges[fromRng].applyColumnStyles(from - rangeStart[fromRng]);
                        for (++fromRng; fromRng < toRng; ++fromRng) {
                            ranges[fromRng].applyColumnStyles();
                        }
                        ranges[toRng].applyColumnStyles(0, to - rangeStart[toRng]);
                    }
                } else {
                    base.applyColumnStyles.call(this, from, to);
                }
            },

            // public
            getRanges: function (counts) {
                var len = counts.length,
                    ranges = this.ranges = new Array(len),
                    rangeStart = this.rangeStart = new Array(len+1),
                    columns = this.columns,
                    idx = 0, end, i;

                for (i = 0; i < len; ++i) {
                    rangeStart[i] = idx;
                    end = idx + counts[i];
                    ranges[i] = new Range(columns.slice(idx, end));
//                    ranges[i].addListener('beforeColumnMove', this.createBeforeColumnMoveHandler(i), this);
                    ranges[i].addListener('columnMoved', this.createColumnMovedHandler(i), this);
                    ranges[i].addListener('columnResized', this.createColumnResizedHandler(i), this);
                    idx = end;
                }
                rangeStart[len] = idx;

                // the manager doesn't need to keep track of x positions, if it has ranges
                this.posX = null;

                return ranges;
            },

//            createBeforeColumnMoveHandler: function (rangeIdx) {
//                return function (fromIdx, toIdx) {
//                    var offset = this.rangeStart[rangeIdx];
//                    this.fireEvent('beforeColumnMove', fromIdx + offset, toIdx + offset);
//                }
//            },

            createColumnMovedHandler: function (rangeIdx) {
                return function (fromIdx, toIdx) {
                    if (this.ignoreMoveColumnFromRange) return;
                    var offset = this.rangeStart[rangeIdx];
                    this.moveColumn(fromIdx + offset, toIdx + offset, false, true);
                };
            },

            createColumnResizedHandler: function (rangeIdx) {
                return function (idx, oldWidth, newWidth) {
                    if (this.ignoreResizeColumnFromRange) return;
                    var offset = this.rangeStart[rangeIdx];
                    this.resizeColumn(idx + offset, newWidth, true, true);
                    this.fireEvent('columnResized', idx + offset, oldWidth, newWidth);
                };
            },

            getTotalWidth: function () {
                var ranges = this.ranges, len = ranges.length;
                if (len) {
                    var total = 0;
                    for (var i = 0; i < len; ++i) {
                        total += ranges[i].getTotalWidth();
                    }
                    return total;
                } else {
                    // could call base.getTotalWidth, but it isn't worth it
                    return this.posX[this.columns.length];
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
                if (typeof idx !== 'number' || idx < 0 || idx > this.columns.length) {
                    Adapter.error('Invalid column index: ' + idx);
                }

                var ranges = this.ranges,
                    rangeStart = this.rangeStart,
                    col = this.processConfig(config);

                // call super
                base.addColumn.call(this, idx, col, true);

                for (var i = ranges.length-1; i >= 0; --i) {
                    ++rangeStart[i+1];
                    if (idx >= rangeStart[i]) {
                        ranges[i].addColumn(idx - rangeStart[i], col);
                        break;
                    }
                }

                this.applyColumnStyles(idx);

                if (!suppressEvent) this.fireEvent('columnAdded', idx, col);

                return col;
            },

            removeColumn: function (idx, suppressEvent) {
                if (typeof idx !== 'number' || idx < 0 || idx > this.columns.length) {
                    Adapter.error('Invalid column index: ' + idx);
                }

                var ranges = this.ranges,
                    rangeStart = this.rangeStart,
                    col = this.columns[idx],
                    len, i;

                for (len = col.cssRules.length, i = 0; i < len; ++i) {
                    Adapter.removeCSSRule(this.sheet, col.cssRules[i]);
                }

                // call super
                base.removeColumn.call(this, idx, true);

                for (i = ranges.length-1; i >= 0; --i) {
                    --rangeStart[i+1];
                    if (idx >= rangeStart[i]) {
                        ranges[i].removeColumn(idx - rangeStart[i]);
                        break;
                    }
                }

                this.applyColumnStyles(idx);

                if (!suppressEvent) this.fireEvent('columnRemoved', idx, col);
                return col;
            },

            moveColumn: function (fromIdx, toIdx, suppressEvent, calledFromRange) {
                if (!suppressEvent) this.fireEvent('beforeColumnMove', fromIdx, toIdx);

                base.moveColumn.call(this, fromIdx, toIdx, true);

                var doApplyColStyles = true;

                if (!calledFromRange) {
                    var fromRange = this.getRangeIdx(fromIdx),
                        toRange = this.getRangeIdx(toIdx),
                        rangeStart = this.rangeStart,
                        ranges = this.ranges;

                    if (fromRange != -1 && toRange != -1) {
                        if (fromRange == toRange) {
                            var offset = rangeStart[toRange];
                            this.ignoreMoveColumnFromRange = true;
                            ranges[toRange].moveColumn(fromIdx - offset, toIdx - offset);
                            delete this.ignoreMoveColumnFromRange;
                        } else {
                            var col = ranges[fromRange].removeColumn(fromIdx - rangeStart[fromRange]);
                            ranges[fromRange].applyColumnStyles(fromIdx - rangeStart[fromRange]);
                            ranges[toRange].addColumn(toIdx - rangeStart[toRange], col);
                            ranges[toRange].applyColumnStyles(toIdx - rangeStart[toRange]);
                            doApplyColStyles = false;

                            // modify rangeStart[]
                            var i;
                            if (fromRange < toRange) {
                                for (i = fromRange + 1; i <= toRange; ++i) --rangeStart[i];
                            } else {
                                for (i = toRange + 1; i <= fromRange; ++i) ++rangeStart[i];
                            }
                        }
                    }
                }

                if (doApplyColStyles) {
                    var from = toIdx < fromIdx ? toIdx : fromIdx,
                        to = fromIdx ^ toIdx ^ from;    // the other one
                    this.applyColumnStyles(from, to);
                }

                if (!suppressEvent) this.fireEvent('columnMoved', fromIdx, toIdx);
            },

            resizeColumn: function (idx, newWidth, suppressEvent, calledFromRange) {
                var col = this.columns[idx];
                var rng, oldWidth = col.actWidth;

                if (col.flex) {
                    col.flex = 0;
                    --this.flexColumnCount;
                }

                if (!calledFromRange) {
                    if ((rng = this.getRangeIdx(idx)) == -1) {
                        base.resizeColumn.call(this, idx, newWidth, true);
                    } else {
                        this.ignoreResizeColumnFromRange = true;
                        this.ranges[rng].resizeColumn(idx - this.rangeStart[rng], newWidth);
                        delete this.ignoreResizeColumnFromRange;
                    }
                }
                this.applyColumnStyles(idx);

                if (!suppressEvent) this.fireEvent('columnResized', idx, oldWidth, newWidth);
            },

            fireUpdateColumn: function (idx) {
                var rng = this.getRangeIdx(idx);
                if (rng == -1) {
                    this.fireEvent('updateColumn', idx);
                } else {
                    this.ranges[rng].fireEvent('updateColumn', idx - this.rangeStart[rng]);
                }
            }
        });

        return ColumnManager;
    }
);