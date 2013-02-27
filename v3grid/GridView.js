define('v3grid/GridView',
    ['v3grid/Adapter', 'v3grid/Utils', 'v3grid/DOMCache'],
    function (Adapter, Utils, DOMCache) {

    var GridView = function (config) {
        Adapter.merge(this, config);

        this.initProperties();
        this.attachHandlers();
        this.throttledUpdateDirtyCells = Adapter.createThrottled(this.updateDirtyCells, 200, this);
    }

    GridView.prototype = {
        rowHeight: 22,
        columnBatchSize: 2,
        rowBatchSize: 4,

        setVisibleBox: function (x, y, width, height) {
            var style = this.container.style;
            style.left = x + 'px';
            style.top = y + 'px';
            style.width = width + 'px';
            style.height = height + 'px';
            this.visibleWidth = width;
            this.visibleHeight = height;
            this.scrollTo();
        },

        setTableSize: function () {
            this.tableHeight = (this.totalRowCount * this.rowHeight) || 1;
            this.table.style.height = this.tableHeight + 'px';

            this.tableWidth = this.columnsX[this.columns.length];
            this.table.style.width = this.tableWidth + 'px';
        },

        initProperties: function () {
            // viewPort
            this.firstVisibleRow = 0;
            this.firstVisibleColumn = 0;

            this.visibleRowCount = 0;
            this.visibleColumnCount = 0;
            this.visibleRowsHeight = 0;
            this.visibleColumnsWidth = 0;

            this.lastHScrollPos = 0;
            this.lastVScrollPos = 0;

            // DOM elements

            var gridView = this,
                colCls = this.columnProperties.finalCls;

            var rowCacheConfig = {
                parentDom: this.table,
                rowCls: this.CLS_ROW + ' even',
                create: function () {
                    var row = [];
                    Adapter.addClass(row.dom = document.createElement('div'), this.rowCls);
                    row.cache = new DOMCache({
                        parentDom: row.dom,
                        create: function () {
                            var cell = { dom: document.createElement('div') };
                            Adapter.addClass(cell.dom, gridView.CLS_CELL);
                            gridView.makeUnSelectable(cell.dom);
                            return cell;
                        },
                        initializeItem: function(cell, row, column) {
                            var cls = column[colCls];
                            Adapter.addClass(cell.dom, cls);
                            cell.cls = cls;
                            if (gridView.getCellStyle) {
                                var cellStyle = gridView.getCellStyle(gridView.getDataRowIdx(row), column);
                                gridView.saveAndApply(cell, cellStyle);
                            }
                        },
                        itemReleased: function (cell) {
                            Adapter.removeClass(cell.dom, cell.cls);
                            cell.cls = undefined;
                            if (cell.oldStyle) {
                                Adapter.merge(cell.dom.style, cell.oldStyle);
                                delete cell.oldStyle;
                            }
                        }
                    });
                    return row;
                },
                initializeItem: function (row, dr) {
                    var columns = gridView.columns,
                        firstCol = gridView.firstVisibleColumn,
//                        finalCls = gridView.columnProperties.finalCls,
                        cache = row.cache,
                        columnCount = gridView.visibleColumnCount,
                        len = row.length;

//                    console.log('initRow', len, columnCount);
//
//                    while (len > columnCount) {
//                        cache.release(row[--len]);
//                    }

                    while (len < columnCount) {
                        row[len] = cache.get(dr, columns[len + firstCol]);
                        ++len;
                    }
                    row.length = len;

                    if (gridView.getRowStyle) {
                        var rowStyle = gridView.getRowStyle(gridView.getDataRowIdx(dr));
                        gridView.saveAndApply(row, rowStyle);
                    }

                    cache.validate();
                },
                itemReleased: function (row) {
                    Adapter.merge(row.dom.style, row.oldStyle);
                    delete row.oldStyle;
                },
                itemRemoved: function (row) {
                    var cache = row.cache;
                    for (var len = row.length, i = 0; i < len; ++i) {
                        cache.release(row[i]);
                    }
                    row.length = 0;
                }
            };

            // [vrow] = { dom: <div>, cache: DOMCache }
            // [vrow][vcol] = cell = { dom: <div> }
            this.visibleCells = [];
            // even & odd rows
            this.visibleCells.cache = [new DOMCache(rowCacheConfig)];
            rowCacheConfig.rowCls = this.CLS_ROW + ' odd';
            this.visibleCells.cache[1] = new DOMCache(rowCacheConfig);

            // dirtyCells[linearIdx] = true;
            this.dirtyCells = {};
            this.dirtyCellCount = 0;

            this.xPos = this.yPos = 0;

            // the ColumnManager does not change the arrays, just their contents, we can cache them
            this.columns = this.colMgr.columns || [];
            this.columnsX = this.colMgr.posX;
            this.totalRowCount = this.totalRowCount || (this.data ? this.data.length : 0);

            this.colMgr.addListener('columnMoved', this.columnMoved, this);
            this.colMgr.addListener('columnResized', this.columnResized, this);
            this.colMgr.addListener('updateColumn', this.updateColumn, this);
        },

        saveAndApply: function (item, style) {
            var domStyle = item.dom.style,
                oldValues = item.oldStyle = {};

            for (var key in style) if (style.hasOwnProperty(key)) {
                oldValues[key] = domStyle[key];
            }

            Adapter.merge(domStyle, style);
        },

        columnMoved: function (from, to) {
            from -= this.firstVisibleColumn;
            to -= this.firstVisibleColumn;

            var dir = from < to ? 1 : -1;

            this.copyVisibleColumn(from, -1);
            for (var i = from; i != to; i += dir) {
                this.copyVisibleColumn(i + dir, i);
            }
            this.copyVisibleColumn(-1, to);
        },

        columnResized: function (idx, oldW, newW) {
            this.visibleColumnsWidth += newW - oldW;
            this.setTableSize();
            this.hScrollTo();
        },

        attachHandlers: function () {
            if (Adapter.isFunction(this.cellClicked)) {
                Adapter.addListener(this.table, 'click', this.tableClicked, this);
            }
        },

        tableClicked: function (evt) {
            Adapter.fixPageCoords(evt);

            var x = evt.pageX - Adapter.getPageX(this.table),
                y = evt.pageY - Adapter.getPageY(this.table),
                first = this.firstVisibleColumn,
                colIdx = this.searchColumn(x, first, first + this.visibleColumnCount),
                rowIdx = (y / this.rowHeight) >> 0;

            if (rowIdx >= 0 && rowIdx < this.totalRowCount &&
                colIdx >= 0 && colIdx < this.columns.length) {
                this.cellClicked(rowIdx, this.columns[colIdx].dataIndex, evt);
            }
        },

        setYPos: function (y) {
            this.yPos = -y;
            Adapter.setPos(this.table, this.xPos, this.yPos);
        },

        setXPos: function (x) {
            this.xPos = -x;
            Adapter.setPos(this.table, this.xPos, this.yPos);
        },

        vScrollTo: function (topPos, forceUpdate) {
            if (this.updateViewPortV(topPos, forceUpdate)) {
                this.updateRows();
                if (!Adapter.hasTouch) this.mouseIsOver();
            }
        },

        hScrollTo: function (leftPos, forceUpdate) {
            if (this.updateViewPortH(leftPos, forceUpdate)) {
                this.updateColumns();
            }
        },

        updateViewPortH: function (scrollPos, forceUpdate) {
            // store current scrollPos so we can use it later if it's not provided
            if (scrollPos === undefined) scrollPos = this.lastHScrollPos;
            else this.lastHScrollPos = scrollPos;

            var columnsX = this.columnsX,
                first = this.firstVisibleColumn,
                offset = scrollPos - columnsX[first];

            if (!forceUpdate && offset > 0 && offset + this.visibleWidth < this.visibleColumnsWidth) {
//                console.log('ViewPortH not changed');
                return false;
            }

            this.prevFirstVisibleColumn = first;
            var batch = this.columnBatchSize,
                totalCount = this.columns.length;

            first = this.searchColumn(scrollPos, 0, totalCount);
            // jump batch columns
            first = (first / batch >> 0)*batch;

            // calculate the count
            var count = this.visibleColumnCount,
                prevCount = this.prevVisibleColumnCount = count,
                endPos = scrollPos + this.visibleWidth;

            // special case: we only need to increase count (by batches)
            if (first == this.prevFirstVisibleColumn) {
                var last = first + count;
                while (last <= totalCount && columnsX[last] < endPos) {
                    last += batch;
                }
                count = last - first;
            } else {
                count = this.searchColumn(endPos, 0, totalCount) - first;

                // a little rounding up
                count += (batch - count % batch);

                // don't decrease if we're within 'batch' number of rows from the previous
                if (count == prevCount-batch) count = prevCount;
            }

            if (first + count > totalCount) {
                first = totalCount - count;
                if (first < 0) { count += first; first = 0; }
            }

            this.firstVisibleColumn = first;
            this.visibleColumnsWidth = columnsX[first+count] - columnsX[first];
            this.visibleColumnCount = count;

//            console.log('ViewPortH [', this.firstVisibleColumn, this.visibleColumnCount, ']');

            return first != this.prevFirstVisibleColumn || prevCount != count;
        },

        updateViewPortV: function (scrollPos, forceUpdate) {
            if (scrollPos === undefined) scrollPos = this.lastVScrollPos;
            else this.lastVScrollPos = scrollPos;

            var first = this.firstVisibleRow,
                rowHeight = this.rowHeight,
                offset = scrollPos - first * rowHeight;

            if (!forceUpdate && offset > 0 && offset + this.visibleHeight < this.visibleRowsHeight) {
//                console.log('ViewPortV not changed');
                return false;
            }

            var batch = this.rowBatchSize;
            this.prevFirstVisibleRow = first;

            first = scrollPos / rowHeight >> 0;

            // jump batch rows
            first = (first / batch >> 0)*batch;

            // calculate the count
            var count = this.visibleRowCount,
                prevCount = this.prevVisibleRowCount = count,
                totalCount = this.totalRowCount;

            // special case: we only need to increase count (by batches)
            if (first == this.prevFirstVisibleRow) {
                var last = first + count,
                    endPos = scrollPos + this.visibleHeight;
                while (last <= totalCount && last*rowHeight < endPos) {
                    last += batch;
                }
                count = last - first;
            } else {
                count = ((scrollPos + this.visibleHeight) / rowHeight >> 0) - first;

                // a little rounding up
                count += (batch - count % batch);

                // don't decrease if we're within 'batch' number of rows from the previous
                if (count == prevCount-batch) count = prevCount;
            }

            if (first + count > totalCount) {
                first = totalCount - count;
                if (first < 0) { count += first; first = 0; }
            }

            this.firstVisibleRow = first;
            this.visibleRowsHeight = count*rowHeight;
            this.visibleRowCount = count;

//            console.log('ViewPortV [', this.firstVisibleRow, this.visibleRowCount, ']');

            return first != this.prevFirstVisibleRow || prevCount != count;
        },

        // binary search to find the column index under X position 'pos'
        searchColumn: function (pos, low, high) {
            var mid, columnX = this.columnsX;
            while (low+1 < high) if (columnX[mid = (low+high) >> 1] > pos) high = mid-1; else low = mid;
            return (low+1 == high && high < this.columns.length && columnX[high] < pos) ? high : low;
        },

        getColumnIdx: function (posX) {
            var firstCol = this.firstVisibleColumn;
            return this.searchColumn(posX, firstCol, firstCol + this.visibleColumnCount);
        },

        updateColumns: function () {
            var prevCount = this.prevVisibleColumnCount,
                count = this.visibleColumnCount,
                cells = this.visibleCells,
                recycleColumn = this.recycleColumn,
                addColumn = this.addColumn,
                copyVisibleColumn = this.copyVisibleColumn,
                shiftOffset = this.prevFirstVisibleColumn - this.firstVisibleColumn,
                overlapFrom = -shiftOffset,
                overlapTo = overlapFrom + count,
                vc;

            overlapFrom = Utils.minMax(overlapFrom, 0, prevCount);
            overlapTo = Utils.minMax(overlapTo, 0, prevCount);

            var removeTo = prevCount;
            if (overlapFrom < removeTo) removeTo = overlapFrom;
            for (vc = 0 ; vc < removeTo; ++vc) recycleColumn.call(this, vc);

            var removeFrom = overlapTo;
            if (removeFrom < 0) removeFrom = 0;
            for (vc = removeFrom; vc < prevCount; ++vc) recycleColumn.call(this, vc);

            // copy overlapping columns
            if (shiftOffset < 0) for (vc = overlapFrom; vc < overlapTo; ++vc) {
                copyVisibleColumn.call(this, vc, vc + shiftOffset);
            } else if (shiftOffset > 0) for (vc = overlapTo-1; vc >= overlapFrom; --vc) {
                copyVisibleColumn.call(this, vc, vc + shiftOffset);
            }

            // fill up new columns
            overlapFrom = Utils.minMax(overlapFrom+shiftOffset, 0, count);
            overlapTo = Utils.minMax(overlapTo+shiftOffset, 0, count);

            for (vc = 0; vc < overlapFrom; ++vc) addColumn.call(this, vc);
            for (vc = overlapTo; vc < count; ++vc) addColumn.call(this, vc);

            // remove cells from dom
            for (var rowCnt = this.visibleRowCount, vr = 0; vr < rowCnt; ++vr) {
                cells[vr].cache.validate();
            }

//        function range(from, to) {
//            return (from == to ? '-' : (to-from)+'('+from+'-'+(to-1)+')');
//        }
//
//        console.log(' updateColumn - Count:'+ prevCount + ' -> ' + count +
//            ' first:'+this.prevFirstVisibleColumn + ' -> ' + this.firstVisibleColumn +
//            ' removed:['+range(0, removeTo)+', '+range(removeFrom, prevCount)+']' +
//            ' overlap:['+range((overlapFrom-shiftOffset),(overlapTo-shiftOffset))+']->['+range(overlapFrom,overlapTo)+']' +
//            ' added:['+range(0,overlapFrom)+', '+range(overlapTo,count)+']');

        },

        updateRows: function () {
            var prevCount = this.prevVisibleRowCount,
                count = this.visibleRowCount,
                prevFirst = this.prevFirstVisibleRow,
                first = this.firstVisibleRow,
                cells = this.visibleCells,
                recycleRow = this.recycleRow,
                addRow = this.addRow,
                vr, dr,
                shiftOffset = prevFirst - first,
                overlapFrom = -shiftOffset,
                overlapTo = overlapFrom + count;

            overlapFrom = Utils.minMax(overlapFrom, 0, prevCount);
            overlapTo = Utils.minMax(overlapTo, 0, prevCount);

            var removeTo = prevCount;
            if (overlapFrom < removeTo) removeTo = overlapFrom;
            for (vr = 0, dr = prevFirst + vr; vr < removeTo; ++vr, ++dr) recycleRow.call(this, vr, dr);

            var removeFrom = overlapTo;
            if (removeFrom < 0) removeFrom = 0;
            for (vr = removeFrom, dr = prevFirst + vr; vr < prevCount; ++vr, ++dr) recycleRow.call(this, vr, dr);

            // copy overlapping rows
            if (shiftOffset < 0) for (vr = overlapFrom; vr < overlapTo; ++vr) {
                cells[vr + shiftOffset] = cells[vr];
            } else if (shiftOffset > 0) for (vr = overlapTo-1; vr >= overlapFrom; --vr) {
                cells[vr + shiftOffset] = cells[vr];
            }

            // fill up new rows
            overlapFrom = Utils.minMax(overlapFrom+shiftOffset, 0, count);
            overlapTo = Utils.minMax(overlapTo+shiftOffset, 0, count);

            for (vr = 0, dr = first + vr; vr < overlapFrom; ++vr, ++dr) addRow.call(this, vr, dr);
            for (vr = overlapTo, dr = first + vr; vr < count; ++vr, ++dr) addRow.call(this, vr, dr);

            // remove rows from dom if needed
            cells.cache[0].validate();
            cells.cache[1].validate();

//        function range(from, to) {
//            return (from == to ? '-' : (to-from)+'('+from+'-'+(to-1)+')');
//        }
//
//        console.log(' updateRow - Count:'+ this.prevVisibleRowCount + ' -> '+this.visibleRowCount +
//            ' first:'+this.prevFirstVisibleRow + ' -> ' + this.firstVisibleRow +
//            ' removed:['+range(0, removeTo)+', '+range(removeFrom, this.prevVisibleRowCount)+']' +
//            ' overlap:['+range((overlapFrom-shiftOffset),(overlapTo-shiftOffset))+']->['+range(overlapFrom,overlapTo)+']' +
//            ' added:['+range(0,overlapFrom)+', '+range(overlapTo,this.visibleRowCount)+']');
        },

        columnProperties: { renderer: 'renderer', rendererConfig: 'rendererConfig', finalCls: 'finalCls'},

        addColumn: function (vc) {
            var cells = this.visibleCells,
                column = this.columns[this.firstVisibleColumn + vc],
//                colCls = column[this.columnProperties.finalCls],
                count = this.visibleRowCount,
                vr, dr;

            for (vr = 0, dr = this.firstVisibleRow; vr < count; ++vr, ++dr) {
                cells[vr][vc] = cells[vr].cache.get(dr, column);
            }
            this.updateVisibleColumn(vc);
        },

        updateVisibleColumn: function (vc) {
            var cells = this.visibleCells,
                updateCell = this.updateCell,
                dc = this.firstVisibleColumn + vc,
                colProps = this.columnProperties,
                col = this.columns[dc],
                count = this.visibleRowCount,
                vr, dr;

            for (vr = 0, dr = this.firstVisibleRow; vr < count; ++vr, ++dr) {
                updateCell.call(this, dr, col, cells[vr][vc],
                    col[colProps.renderer], col[colProps.rendererConfig]);
            }
        },

        updateColumn: function (dc) {
            var vc = dc - this.firstVisibleColumn;
            if (vc >= 0 && vc < this.visibleColumnCount) {
                this.updateVisibleColumn(vc);
            }
        },

        addRow: function (vr, dr) {
            var columns = this.columns,
                cells = this.visibleCells,
                colProps = this.columnProperties,
                updateCell = this.updateCell;

            cells[vr] = cells.cache[dr & 1].get(dr);
            Adapter.setY(cells[vr].dom, (vr + this.firstVisibleRow) * this.rowHeight);

            for (var count = this.visibleColumnCount, vc = 0, dc = this.firstVisibleColumn; vc < count; ++vc, ++dc) {
                updateCell.call(this, dr, columns[dc], cells[vr][vc],
                    columns[dc][colProps.renderer], columns[dc][colProps.rendererConfig]);
            }
        },

        makeUnSelectable:function (dom) {
            dom.onselectstart = this.falseFunction;
        },

        falseFunction: function () {
            return false;
        },

        addClassToRow: function (cls, row) {
            Adapter.addClass(this.visibleCells[row - this.firstVisibleRow].dom, cls);
        },

        removeClassFromRow: function (cls, row) {
            Adapter.removeClass(this.visibleCells[row - this.firstVisibleRow].dom, cls);
        },

        addClassToColumn: function (cls, colIdx) {
            var cells = this.visibleCells,
                count = this.visibleRowCount,
                vc = colIdx - this.firstVisibleColumn;

            for (var r = 0; r < count; ++r) Adapter.addClass(cells[r][vc].dom, cls)
        },

        removeClassFromColumn: function (cls, colIdx) {
            var cells = this.visibleCells,
                count = this.visibleRowCount,
                vc = colIdx - this.firstVisibleColumn;
            for (var r = 0; r < count; ++r) Adapter.removeClass(cells[r][vc].dom, cls)
        },

        copyVisibleColumn: function (fromIdx, toIdx) {
            var cells = this.visibleCells, count = this.visibleRowCount;
            for (var vr = 0; vr < count; ++vr)
                cells[vr][toIdx] = cells[vr][fromIdx];
        },

        // recycle column cells
        recycleColumn: function(vc) {
            var cells = this.visibleCells;

            for (var count = this.visibleRowCount, vr = 0; vr < count; ++vr) {
                cells[vr].cache.release(cells[vr][vc]);
            }
        },

        recycleRow: function (vr, dr) {
            this.visibleCells.cache[dr & 1].release(this.visibleCells[vr]);
        },

        updateCell: function (row, col, cell, rendererType, rendererConfig) {
            var renderer = cell.renderer;

            // cell has a renderer, but it's the wrong type (or became invisible) => recycle renderer
            if (renderer && (!(renderer instanceof rendererType) || !col.visible)) {
                this.availableRenderers[renderer['-v3grid-type-id']].push(renderer);
                renderer = null;
            }

            if (!renderer && col.visible) {
                var availArr = this.availableRenderers[rendererType['-v3grid-type-id']];
                if (availArr.length == 0) {
                    rendererType = this.grid.getRenderer(rendererType);
                    renderer = new rendererType(rendererConfig);
                    renderer['-v3grid-type-id'] = rendererType['-v3grid-type-id'];
                } else {
                    renderer = availArr.pop();
                }
            }

            if (cell.renderer !== renderer) {
                if (renderer && renderer.view.parentNode) renderer.view.parentNode.removeChild(renderer.view);
                if (cell.dom.firstChild) cell.dom.removeChild(cell.dom.firstChild);
            }

            if (col.visible) {
                // apply user cell style
                if (this.getCellStyle) {
                    if (cell.oldStyle) {
                        Adapter.merge(cell.dom.style, cell.oldStyle);
                        delete cell.oldStyle;
                    }
                    var cellStyle = this.getCellStyle(this.getDataRowIdx(row), col);
                    this.saveAndApply(cell, cellStyle);
                }
                if (rendererConfig) renderer.setConfig(rendererConfig);
                renderer.updateData(this, row, col);
            }

            if (cell.renderer !== renderer) {
                cell.renderer = renderer;
                if (renderer) cell.dom.appendChild(renderer.view);
            }
        },

        setTotalRowCount: function (rowCount) {
            this.totalRowCount = rowCount;
            this.setTableSize();
            this.vScrollTo(undefined, true);
            // TODO: update only the part that was not updated by onVerticalScroll()
            this.updateView();
        },

        // TODO : change key
        updateDirtyCells: function () {
            var firstRow = this.firstVisibleRow,
                firstCol = this.firstVisibleColumn,
                colCount = this.visibleColumnCount,
                rowCount = this.visibleRowCount,
                cells = this.visibleCells,
                columns = this.columns,
                totalColumns = columns.length;

            for (var key in this.dirtyCells) {
                var cellIdx = +key;
                var dc = cellIdx % totalColumns;
                var dr = cellIdx / totalColumns >> 0;
                var vr = dr - firstRow;
                var vc = dc - firstCol;
                if (vr >= 0 && vc >= 0 && vr < rowCount && vc < colCount) {
                    cells[vr][vc].renderer.updateData(this, dr, columns[dc]);
                }
            }

            this.dirtyCells = { };
            this.dirtyCellCount = 0;
        },

        updateRowStyles: function (from, to) {
            var cells = this.visibleCells;

            for (var vr = from, dr = this.firstVisibleRow + from; vr < to; ++dr, ++vr) {
                var row = cells[vr];
                Adapter.merge(row.dom.style, row.oldStyle);
                var rowStyle = this.getRowStyle(this.getDataRowIdx(dr));
                this.saveAndApply(row, rowStyle);
            }
        },

        updateView:function () {
            var colCount = this.visibleColumnCount,
                rowCount = this.visibleRowCount,
                cells = this.visibleCells,
                columns = this.columns;

            // update row styles
            if (this.getRowStyle) {
                this.updateRowStyles(0, rowCount);
            }

            for (var vc = 0, dc = this.firstVisibleColumn; vc < colCount; ++dc, ++vc) {
                if (!columns[dc].visible) continue;

                for (var vr = 0, dr = this.firstVisibleRow; vr < rowCount; ++dr, ++vr) {
                    cells[vr][vc].renderer.updateData(this, dr, columns[dc]);
                    // apply user cell style
                    if (this.getCellStyle) {
                        var cellStyle = this.getCellStyle(this.getDataRowIdx(dr), columns[dc]);
                        this.saveAndApply(cells[vr][vc], cellStyle);
                    }
                }
            }

            this.dirtyCells = { };
            this.dirtyCellCount = 0;
        },

        scrollTo: function (x, y) {
//            x = x || 0;
//            y = y || 0;
            this.vScrollTo(y);
            this.hScrollTo(x);
        },

        // row:Number - rowIndex
        // col:String - column's dataIndex
        getData: function (row, col) {
            return this.data[row][col];
        },

        // row:Number - rowIndex
        // colIdx:Number - column's Index
        invalidateData:function (row, col) {
            var colIdx = this.colMgr.columnMap[col];
            if (colIdx === undefined) return;

            var vrow = row - this.firstVisibleRow,
                vcol = colIdx - this.firstVisibleColumn,
                key = row * this.columns.length + colIdx;

            if (vrow >= 0 && vrow < this.visibleRowCount &&
                vcol >= 0 && vcol < this.visibleColumnCount &&
                !this.dirtyCells.hasOwnProperty(key))
            {
                this.dirtyCells[key] = true;
                ++this.dirtyCellCount;
                this.throttledUpdateDirtyCells();
            }
        },

        mouseIsOver: function (x, y) {
            if (x === undefined) x = this.mousePageX || -1;
            if (y === undefined) y = this.mousePageY || -1;

            this.mousePageX = x;
            this.mousePageY = y;

            // highlight the row the mouse is over
            y -= Adapter.getPageY(this.table);

            var row = y < 0 ? -1 : (y / this.rowHeight) >> 0;
            this.highlightRow(row);
        },

        highlightRow: function (row) {
            var vrow = row - this.firstVisibleRow,
                hlRow = (vrow >= 0 && vrow < this.visibleRowCount) ? this.visibleCells[vrow].dom : null,
                oldHlRow = this.highlightedRow;

            if (oldHlRow === hlRow) return;

            if (oldHlRow) Adapter.removeClass(oldHlRow, 'hover');

            this.highlightedRow = hlRow;

            if (hlRow) Adapter. addClass(hlRow, 'hover');
        }


    };

    return GridView;
});
