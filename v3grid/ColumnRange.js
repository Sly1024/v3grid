ClassDef('v3grid.ColumnRange',
    ['v3grid.Adapter', 'v3grid.Utils'],
    function (Adapter, Utils) {
        return {
            extends: 'v3grid.Observable',

            ctor: function ColumnRange(columns, useTopColumns) {
                this.maxDepth = 0;
                this.columns = useTopColumns ? columns : this.getLeafColumns(columns);

                this.posX = new Array(this.columns.length+1);

                /**
                 * [dataIdx] = array of indices of columns
                 * @type {Object}
                 */
                this.colDataIdx2Idxs = {};

                /**
                 * [colId] = index in columns
                 * @type {Object}
                 */
                this.colId2Idx = {};
                this.generateColumnMap();
            },

            getTotalWidth: function () {
                return this.posX[this.columns.length];
            },

            getLeafColumns: function (columns) {
                var result = [], maxDepth = 0;

                Utils.walkTree(columns, function (col, idx, arr, parent, depth) {
                    col.parent = parent;
                    col.depth = depth;
                    if (depth > maxDepth) maxDepth = depth;
                    if (!col.children) result.push(col);
                });

                this.maxDepth = maxDepth;

                return result;
            },

            // both inclusive (normal: 0, total)
            calcPosX: function (fromIdx, toIdx) {
                var columnsX = this.posX;
                if (!columnsX) return;

                var startX, columns = this.columns;

                fromIdx = fromIdx || 0;
                if(toIdx === undefined) toIdx = columns.length;

                if (fromIdx == 0) {
                    columnsX[0] = startX = 0;
                } else {
                    startX = columnsX[--fromIdx];
                }

                for (var i = fromIdx; i < toIdx;) {
                    startX += columns[i].actWidth;
                    ++i;
                    columnsX[i] = startX;
                }
            },

            // both inclusive
            generateColumnMap: function (fromIdx, toIdx, removed) {
                var id2Idx = this.colId2Idx,
                    di2Idxs = this.colDataIdx2Idxs,
                    columns = this.columns,
                    idx, arr;

                if (removed) {
                    idx = id2Idx[removed.id];
                    delete id2Idx[removed.id];
                    arr = di2Idxs[removed.dataIndex];
                    if (arr) Adapter.arrayRemove(arr, idx);
                }

                fromIdx = fromIdx || 0;
                if(toIdx === undefined) toIdx = columns.length-1;

                for (var i = fromIdx; i <= toIdx; ++i) {
                    var id = columns[i].id;
                    var dataIndex = columns[i].dataIndex;

                    if (arr = di2Idxs[dataIndex]) {
                        idx = Adapter.indexOf(arr, id2Idx[id]);
                        if (idx >= 0) arr[idx] = i; else arr.push(i);
                    } else {
                        di2Idxs[dataIndex] = [i];
                    }
                    id2Idx[id] = i;
                }
            },

            // public
            moveColumn: function (fromIdx, toIdx, suppressEvent) {
                // TODO: validate indices
                if (!suppressEvent) this.fireEvent('beforeColumnMove', fromIdx, toIdx);

                var columns = this.columns,
                    colObj = columns[fromIdx];

                columns.splice(fromIdx, 1);
                columns.splice(toIdx, 0, colObj);

//                update stuff
                var from = fromIdx > toIdx ? toIdx : fromIdx,
                    to = fromIdx ^ toIdx ^ from;    // the other one

                this.calcPosX(from, to);
                this.generateColumnMap(from, to);
                if (!suppressEvent) this.fireEvent('columnMoved', fromIdx, toIdx);
            },

            resizeColumn: function (idx, newWidth, suppressEvent) {
                var col = this.columns[idx];

                if (newWidth < col.minWidth) newWidth = col.minWidth;
                var oldWidth = col.actWidth;

                col.width = col.actWidth = newWidth;
                this.calcPosX(idx+1);

                if (!suppressEvent) this.fireEvent('columnResized', idx, oldWidth, newWidth);
            },

            addColumn: function (idx, config, suppressEvent) {
                this.columns.splice(idx, 0, config);
                this.calcPosX(idx);
                this.generateColumnMap(idx);
                if (!suppressEvent) this.fireEvent('columnAdded', idx, config);
            },

            removeColumn: function (idx, suppressEvent) {
                var col = this.columns[idx];
                this.columns.splice(idx, 1);
                this.calcPosX(idx);
                this.generateColumnMap(idx, undefined, col);
                if (!suppressEvent) this.fireEvent('columnRemoved', idx, col);
                return col;
            },

            // both inclusive (normal: 0, total-1)
            applyColumnStyles: function (from, to) {
                var columns = this.columns,
                    columnsX = this.posX;
//                    parents = {}, hasParent = false;

                from = from || 0;
                if (to === undefined) to = columns.length-1;

                for (var dc = from; dc <= to; ++dc) {
                    var col = columns[dc];
                    this.applyStyleToColumn(col, columnsX[dc]);

//                    var parent = col.parent;
//                    if (parent) {
//                        parents[parent.id] = parent;
//                        hasParent = true;
//                    }
                }
//
//                while (hasParent) {
//                    var tempParents = parents;
//                    parents = {};
//                    hasParent = false;
//                    Adapter.objEach(tempParents, function (id, col) {
//
//                    });
//                }
            },

            applyStyleToColumn: function (col, xPos) {
                Adapter.setXCSS(col.layoutRule, xPos);
                col.layoutRule.style.width = col.actWidth + 'px';
            }
        };
    }
);
