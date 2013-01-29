define('v3grid/GridView', ['v3grid/Adapter', 'v3grid/Utils'], function (Adapter, Utils) {

    var GridView = function (config) {
        Adapter.merge(this, config);

        this.initProperties();
        this.validateConfig();
        this.attachHandlers();
        this.throttledUpdateDirtyCells = Utils.createThrottled(this.updateDirtyCells, 200, this);

        this.columnPosX = this.columnPosX || new Array(this.columns.length+1);
        this.dataIdx2ColIdx = this.dataIdx2ColIdx || {};
//        this.generateDataIdx2ColIdx();
    }

    GridView.prototype = {
        rowHeight: 22,
        columnBatchSize: 2,
        rowBatchSize: 4,

        scrollXOffset: 0,

        setVisibleSize: function (width, height) {
            this.visibleWidth = width;
            this.visibleHeight = height;
            this.scrollTo();
        },

        setTableSize: function () {
            this.tableHeight = (this.totalRowCount * this.rowHeight) || 1;
            this.table.style.height = this.tableHeight + 'px';

            this.tableWidth = this.columnPosX[this.columns.length] + this.scrollXOffset;
            this.table.style.width = this.tableWidth + 'px';

            if (this.lastScrollXOffset != this.scrollXOffset) {
                this.lastScrollXOffset = this.scrollXOffset;
                Adapter.updateCSSRule('.' +this.CLS_ROW_SIZE.replace(' ', '.'), 'left', this.scrollXOffset + 'px');
            }
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
            this.visibleCells = [];           // [vrow][vcol] = cell <div>; [vrow].row = row <div>

            // cache: reuse rows, cells & renderers
            this.availEvenRows = [];
            this.availOddRows = [];
            this.invalidRows = [];      // rows that have cells with no column-styles set

            // dirtyCells[linearIdx] = true;
            this.dirtyCells = {};
            this.dirtyCellCount = 0;
        },

        validateConfig: function () {
            this.columns = this.columns || [];
            this.totalRowCount = this.totalRowCount || (this.data ? this.data.length : 0);
        },

        attachHandlers: function () {
            if (Adapter.isFunction(this.cellClicked)) {
                Adapter.addListener(this.table, 'click', this.tableClicked, this);
            }
        },

        tableClicked: function (evt) {
            Adapter.fixPageCoords(evt);

            var x = evt.pageX - Adapter.getPageX(this.table) - this.scrollXOffset,
                y = evt.pageY - Adapter.getPageY(this.table),
                first = this.firstVisibleColumn,
                colIdx = this.searchColumn(x, first, first + this.visibleColumnCount),
                rowIdx = (y / this.rowHeight) >> 0;

            if (rowIdx >= 0 && rowIdx < this.totalRowCount &&
                colIdx >= 0 && colIdx < this.columns.length) {
                this.cellClicked(rowIdx, this.columns[colIdx].dataIndex, evt);
            }
        },

        generateDataIdx2ColIdx: function () {
            var map = this.dataIdx2ColIdx,
                columns = this.columns,
                len = columns.length;

            for (var i = 0; i < len; ++i) {
                map[columns[i].dataIndex] = i;
            }
        },

//        getColumn: function (dataIdx) {
//            return this.columns[this.dataIdx2ColIdx[dataIdx]];
//        },

        onVerticalScroll:function (topPos) {
            if (this.updateViewPortV(topPos)) {
                this.updateRows();
                this.applyRowStyles();
                if (!Adapter.hasTouch) this.mouseIsOver();
            }
        },

        onHorizontalScroll:function (leftPos) {
            if (this.updateViewPortH(leftPos)) {
                this.updateColumns();
            }
        },

        updateViewPortH: function (scrollPos) {
            // store current scrollPos so we can use it later if it's not provided
            if (scrollPos === undefined) scrollPos = this.lastHScrollPos;
            else this.lastHScrollPos = scrollPos;

            var columnsX = this.columnPosX,
                first = this.firstVisibleColumn,
                offset = scrollPos - columnsX[first];

            if (offset > 0 && offset + this.visibleWidth < this.visibleColumnsWidth) {
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

        updateViewPortV: function (scrollPos) {
            if (scrollPos === undefined) scrollPos = this.lastVScrollPos;
            else this.lastVScrollPos = scrollPos;

            var first = this.firstVisibleRow,
                rowHeight = this.rowHeight,
                offset = scrollPos - first * rowHeight;

            if (offset > 0 && offset + this.visibleHeight < this.visibleRowsHeight) {
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
            var mid, columnX = this.columnPosX;
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
                removeRowCellsFromDom = this.removeRowCellsFromDom,
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
                removeRowCellsFromDom(cells[vr].row);
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

            this.overlapFrom = overlapFrom;
            this.overlapTo = overlapTo;

            // remove rows from dom if needed
            this.removeRowsFromDom(this.availEvenRows);
            this.removeRowsFromDom(this.availOddRows);
            this.validateColumnStyles();

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

        removeRowCellsFromDom: function (domRow) {
            for(var cells = domRow.availableCells, len = cells.length, i = 0; i < len; ++i) {
                var cell = cells[i];
                if (cell.parentNode == domRow) domRow.removeChild(cell);
            }
        },

        removeRowsFromDom: function (rows) {
            var table = this.table;

            for (var len = rows.length, a = 0; a < len; ++a) {
                var row = rows[a];
                if (row.isUsed) {
                    row.isUsed = false;
                    // remove column styles
                    for (var colCount = row.count, vc = 0; vc < colCount; ++vc) {
                        Adapter.removeClass(row[vc], row[vc].finalCls);
                    }
                    if (row.row.parentNode == table) {
                        table.removeChild(row.row);
                    }
                }
            }
        },

        columnProperties: { renderer: 'renderer', rendererConfig: 'rendererConfig', finalCls: 'finalCls'},

        addColumn: function (vc) {
            var cells = this.visibleCells,
                getCell = this.getCell,
                column = this.columns[this.firstVisibleColumn + vc],
                colCls = column[this.columnProperties.finalCls],
                count = this.visibleRowCount,
                vr, dr;

            for (vr = 0, dr = this.firstVisibleRow; vr < count; ++vr, ++dr) {
                cells[vr][vc] = getCell.call(this, cells[vr].row, colCls);
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

            cells[vr] = this.getRow(this.table, this.CLS_ROW + ' ' + this.CLS_ROW_SIZE, dr & 1);

            for (var count = this.visibleColumnCount, vc = 0, dc = this.firstVisibleColumn; vc < count; ++vc, ++dc) {
                updateCell.call(this, dr, columns[dc], cells[vr][vc],
                    columns[dc][colProps.renderer], columns[dc][colProps.rendererConfig]);
            }
        },

        getRow: function (parentNode, cls, odd) {
            var row, domRow,
                avail = odd ? this.availOddRows : this.availEvenRows;

            // check in the cache
            if (avail.length > 0) {
                row = avail.shift();    // TODO: pop() ??
                domRow = row.row;
                if (!row.isUsed) this.invalidRows.push(row);
            } else {
                // create new
                row = [];
                row.row = domRow = document.createElement('div');
                domRow.availableCells = [];
                row.count = 0;
                this.invalidRows.push(row);
                if (cls) Adapter.addClass(domRow, cls);
                if (odd !== undefined) Adapter.addClass(domRow, odd ? 'odd' : 'even');
            }

            row.isUsed = true;

            var count = row.count,
                visibleCount = this.visibleColumnCount;

            while (count > visibleCount) {
                --count;
                domRow.availableCells.push(row[count]);
            }
            while (count < visibleCount) {
                row[count] = this.getCell(domRow);
                ++count;
            }

            if (domRow.parentNode != parentNode) parentNode.appendChild(domRow);

            return row;
        },

        getCell: function (domRow, cls) {
            var cell;

            // first check in the cache
            if (domRow.availableCells.length > 0) cell =  domRow.availableCells.pop();
            else {
                // create new
                cell = document.createElement('div');
                this.makeUnSelectable(cell);
                Adapter.addClass(cell, this.CLS_CELL);
            }
            if (cls) {
                Adapter.addClass(cell, cls);
                cell.finalCls = cls;
            }
            if (cell.parentNode != domRow) domRow.appendChild(cell);
            return cell;
        },

        makeUnSelectable:function (dom) {
            dom.onselectstart = this.falseFunction;
        },

        falseFunction: function () {
            return false;
        },

        applyRowStyles: function () {
            var rowHeight = this.rowHeight,
                vcells = this.visibleCells,
                count = this.visibleRowCount,
                firstRow = this.firstVisibleRow,
                oFrom = this.overlapFrom,
                vr;

            for (vr = 0; vr < oFrom; ++vr) {
                Adapter.setY(vcells[vr].row, (vr + firstRow) * rowHeight);
            }
            for (vr = this.overlapTo; vr < count; ++vr) {
                Adapter.setY(vcells[vr].row, (vr + firstRow) * rowHeight);
            }
        },

        validateColumnStyles: function () {
            var firstCol = this.firstVisibleColumn,
                columns = this.columns, colCount = this.visibleColumnCount,
                finalCls = this.columnProperties.finalCls;

            // need to reapply column styles
            var irows = this.invalidRows, len = irows.length;
            for (var vc = 0; vc < colCount; ++vc) {
                var colCls = columns[vc + firstCol][finalCls];
                for (var r = 0; r < len; ++r) {
                    Adapter.addClass(irows[r][vc], colCls);
                    irows[r][vc].finalCls = colCls;
                }
            }
            irows.length = 0;
        },

        addClassToColumn: function (cls, colIdx) {
            var vcells = this.visibleCells,
                count = this.visibleRowCount,
                vc = colIdx - this.firstVisibleColumn;

            for (var r = 0; r < count; ++r) Adapter.addClass(vcells[r][vc], cls)
        },

        removeClassFromColumn: function (cls, colIdx) {
            var vcells = this.visibleCells,
                count = this.visibleRowCount,
                vc = colIdx - this.firstVisibleColumn;
            for (var r = 0; r < count; ++r) Adapter.removeClass(vcells[r][vc], cls)
        },

        copyVisibleColumn: function (fromIdx, toIdx) {
            var cells = this.visibleCells, count = this.visibleRowCount;
            for (var vr = 0; vr < count; ++vr)
                cells[vr][toIdx] = cells[vr][fromIdx];
        },

        // recycle column cells
        recycleColumn: function(vc) {
            var cells = this.visibleCells;
//            var dc = vc + this.prevFirstVisibleColumn;

            for (var count = this.visibleRowCount, vr = 0; vr < count; ++vr) {
                cells[vr].row.availableCells.push(cells[vr][vc]);
                Adapter.removeClass(cells[vr][vc], cells[vr][vc].finalCls);
            }
        },

        recycleRow: function (vr, dr) {
            var row = this.visibleCells[vr];
            ((dr & 1) ? this.availOddRows : this.availEvenRows).push(row);
            row.count = this.visibleColumnCount;
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
                if (cell.firstChild) cell.removeChild(cell.firstChild);
            }

            if (col.visible) {
                if (rendererConfig) renderer.setConfig(rendererConfig);
                renderer.updateData(this, row, col);
            }

            if (cell.renderer !== renderer) {
                cell.renderer = renderer;
                if (renderer) cell.appendChild(renderer.view);
            }
        },

        setTotalRowCount: function (rowCount) {
            this.totalRowCount = rowCount;
            this.setTableSize();
            this.onVerticalScroll();
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

        updateView:function () {
            var colCount = this.visibleColumnCount,
                rowCount = this.visibleRowCount,
                cells = this.visibleCells,
                columns = this.columns;

            for (var vc = 0, dc = this.firstVisibleColumn; vc < colCount; ++dc, ++vc) {
                if (!columns[dc].visible) continue;

                for (var vr = 0, dr = this.firstVisibleRow; vr < rowCount; ++dr, ++vr) {
                    cells[vr][vc].renderer.updateData(this, dr, columns[dc]);
                }
            }

            this.dirtyCells = { };
            this.dirtyCellCount = 0;
        },

        scrollTo: function (x, y) {
            this.onVerticalScroll(y);
            this.onHorizontalScroll(x);
        },

        // row:Number - rowIndex
        // col:String - column's dataIndex
        getData: function (row, col) {
            return this.data[row][col];
        },

        // row:Number - rowIndex
        // colIdx:Number - column's Index
        invalidateData:function (row, col) {
            var colIdx = this.dataIdx2ColIdx[col];
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
                hlRow = (vrow >= 0 && vrow < this.visibleRowCount) ? this.visibleCells[vrow].row : null,
                oldHlRow = this.highlightedRow;

            if (oldHlRow === hlRow) return;

            if (oldHlRow) Adapter.removeClass(oldHlRow, 'hover');

            this.highlightedRow = hlRow;

            if (hlRow) Adapter.addClass(hlRow, 'hover');
        },

        columnResized: function (delta) {
            this.visibleColumnsWidth += delta;
            this.setTableSize();
            this.onHorizontalScroll();
        }
    };

    return GridView;
});
