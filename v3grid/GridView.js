define('v3grid/GridView',
    ['v3grid/Adapter', 'v3grid/Utils', 'v3grid/DOMCache'],
    function (Adapter, Utils, DOMCache) {

    var GridView = function (config) {
        Adapter.merge(this, config);

        this.initProperties();
        this.attachHandlers();
        this.throttledUpdateDirtyCells = Adapter.createThrottled(this.updateDirtyCells, 200, this);
    };

    GridView.prototype = {
        rowHeight: 22,
        columnBatchSize: 1,
        rowBatchSize: 2,

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

        cache_getCell: function () {
            var cell = { dom: document.createElement('div') };
            Adapter.addClass(cell.dom, this.CLS_CELL);
            this.makeUnSelectable(cell.dom);
            return cell;
        },

        cache_initCell: function (cell, row, column) {
            var cls = column[this.columnProperties.finalCls];
            Adapter.addClass(cell.dom, cls);
            cell.cls = cls;
            if (this.getCellStyle) {
                var cellStyle = this.getCellStyle(this.dataProvider.getRowId(row), column);
                this.saveAndApplyStyle(cell, cellStyle);
            }
        },

        cache_cellReleased: function (cell) {
            Adapter.removeClass(cell.dom, cell.cls);
            cell.cls = undefined;
            this.revertStyle(cell);
        },

        cache_getRow: function (cache) {
            var row = [];

            Adapter.addClass(row.dom = document.createElement('div'), cache.rowCls);
            row.cache = new DOMCache({
                parentDom: row.dom,
                create: Adapter.bindScope(this.cache_getCell, this),
                initializeItem: Adapter.bindScope(this.cache_initCell, this),
                itemReleased: Adapter.bindScope(this.cache_cellReleased, this)
            });
            return row;
        },

        cache_initRow: function (row, dr) {
            var columns = this.columns,
                firstCol = this.firstVisibleColumn,
                cache = row.cache,
                columnCount = this.visibleColumnCount,
                len = row.length;

            while (len < columnCount) {
                row[len] = cache.get(dr, columns[len + firstCol]);
                ++len;
            }
            row.length = len;

            if (this.getRowStyle) {
                var rowStyle = this.getRowStyle(this.dataProvider.getRowId(dr));
                this.saveAndApplyStyle(row, rowStyle);
            }

            cache.validate();
        },

        cache_rowRemoved: function (row) {
            var cache = row.cache;
            for (var len = row.length, i = 0; i < len; ++i) {
                cache.release(row[i]);
            }
            row.length = 0;
        },

        validateCellCaches: function () {
            var cells = this.visibleCells;
            for (var rowCnt = this.visibleRowCount, vr = 0; vr < rowCnt; ++vr) {
                cells[vr].cache.validate();
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

            var me = this;

            var rowCacheConfig = {
                parentDom: this.table,
                rowCls: this.CLS_ROW + ' even',
                create: function() { return me.cache_getRow(this); },   // this func is called on the cache instance
                initializeItem: Adapter.bindScope(this.cache_initRow, this),
                itemReleased: this.revertStyle, // doesn't use 'this' -> no need to bind
                itemRemoved: this.cache_rowRemoved
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
            var colMgr = this.colMgr;
            this.columns = colMgr.columns || [];
            this.columnsX = colMgr.posX;

            colMgr.addListener('beforeColumnMove', this.beforeColumnMove, this);
            colMgr.addListener('columnAdded', this.columnAdded, this);
            colMgr.addListener('columnRemoved', this.columnRemoved, this);
            colMgr.addListener('columnMoved', this.columnMoved, this);
            colMgr.addListener('columnResized', this.columnResized, this);
            colMgr.addListener('updateColumn', this.updateColumn, this);
        },

        // we need to expand the viewport to include the range [fromIdx, toIdx]
        beforeColumnMove: function (fromIdx, toIdx) {
            var from = fromIdx > toIdx ? toIdx : fromIdx,
                to = fromIdx ^ toIdx ^ from,    // the other one
                first = this.prevFirstVisibleColumn = this.firstVisibleColumn,
                count = this.prevVisibleColumnCount = this.visibleColumnCount,
                needUpdate = false;

            if (from < first) {
                first = this.firstVisibleColumn = fromIdx;
                needUpdate = true;
            }

            if (to >= first + count) {
                // TODO: adjust to batch size!
                this.visibleColumnCount = to - first + 1;
                needUpdate = true;
            }

            if (needUpdate) this.updateColumns();
        },

        columnMoved: function (fromIdx, toIdx) {
            var dir = fromIdx < toIdx ? 1 : -1,
                first = this.firstVisibleColumn;

            fromIdx -= first;
            toIdx -= first;

            this.copyVisibleColumn(fromIdx, -1);
            for (var i = fromIdx; i != toIdx; i += dir) {
                this.copyVisibleColumn(i + dir, i);
            }
            this.copyVisibleColumn(-1, toIdx);
        },

        columnResized: function (idx, oldW, newW) {
            this.visibleColumnsWidth += newW - oldW;
            this.setTableSize();
            this.hScrollTo();
        },

        columnAdded: function (idx, config) {
            if (idx <= this.firstVisibleColumn) {
                ++this.firstVisibleColumn;
                this.hScrollTo();
            } else if (idx < this.firstVisibleColumn + this.visibleColumnCount) {
                this.insertColumn(idx - this.firstVisibleColumn, config);
                if (!this.hScrollTo()) this.validateCellCaches();
            }
        },

        columnRemoved: function (idx, col) {
            if (idx <= this.firstVisibleColumn) {
                --this.firstVisibleColumn;
                this.hScrollTo();
            } else if (idx < this.firstVisibleColumn + this.visibleColumnCount) {
                this.removeColumn(idx - this.firstVisibleColumn);
                if (!this.hScrollTo()) this.validateCellCaches();
            }
        },

        attachHandlers: function () {
            if (Adapter.isFunction(this.cellClicked)) {
                Adapter.addListener(this.table, 'click', this.tableClicked, this);
            }
            if (this.dataProvider.addListener) {
                this.dataProvider.addListener('dataChanged', this.dataChanged, this);
                this.dataProvider.addListener('cellChanged', this.invalidateData, this);
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
                return true;
            }
            return false;
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
            this.validateCellCaches();

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

        insertColumn: function (vc, column) {
            var cells = this.visibleCells,
                count = this.visibleRowCount,
                vr, dr;

            for (vr = 0, dr = this.firstVisibleRow; vr < count; ++vr, ++dr) {
                cells[vr].splice(vc, 0, cells[vr].cache.get(dr, column));
            }
            ++this.visibleColumnCount;
            this.updateVisibleColumn(vc);
        },

        removeColumn: function (vc) {
            var cells = this.visibleCells,
                count = this.visibleRowCount,
                vr, dr;

            this.recycleColumn(vc);
            for (vr = 0, dr = this.firstVisibleRow; vr < count; ++vr, ++dr) {
                cells[vr].splice(vc, 1);
            }
            --this.visibleColumnCount;
            //this.updateVisibleColumn(vc);
        },

        /**
         *
         * @param vc
         */
        addColumn: function (vc) {
            var cells = this.visibleCells,
                column = this.columns[this.firstVisibleColumn + vc],
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
                    this.updateStyle(cell, this.getCellStyle(this.dataProvider.getRowId(row), col));
                }
                if (rendererConfig) renderer.setConfig(rendererConfig);
                renderer.updateData(this, row, col);
            }

            if (cell.renderer !== renderer) {
                cell.renderer = renderer;
                if (renderer) cell.dom.appendChild(renderer.view);
            }
        },

        dataChanged: function () {
            this.totalRowCount = this.dataProvider.getRowCount();
            this.setTableSize();
            this.vScrollTo(undefined, true);
            // TODO: update only the part that was not updated by onVerticalScroll()
            this.updateView();
        },


        // row:Number - rowIndex
        // col:String - column's Name
        invalidateData: function (row, col) {
            var colIdxs = this.colMgr.colDataIdx2Idxs[col];
            if (colIdxs === undefined) return;

            for (var i = 0; i < colIdxs.length; ++i) {
                var colIdx = colIdxs[i];
                var vrow = row - this.firstVisibleRow,
                    vcol = colIdx - this.firstVisibleColumn,
                    key = row * this.columns.length + colIdx;

                if (vrow >= 0 && vrow < this.visibleRowCount &&
                    vcol >= 0 && vcol < this.visibleColumnCount &&
                    !this.dirtyCells[key])
                {
                    this.dirtyCells[key] = true;
                    ++this.dirtyCellCount;
                }
            }

            if (this.dirtyCellCount) this.throttledUpdateDirtyCells();
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

        saveAndApplyStyle: function (item, style) {
            if (!style) return;

            var domStyle = item.dom.style,
                oldValues = {},
                hasValue = false;

            for (var key in style) if (style.hasOwnProperty(key)) {
                oldValues[key] = domStyle[key];
                hasValue = true;
            }

            if (hasValue) {
                Adapter.merge(domStyle, style);
                item.oldStyle = oldValues;
            }
        },

        revertStyle: function (item) {
            if (item.oldStyle) {
                Adapter.merge(item.dom.style, item.oldStyle);
                delete item.oldStyle;
            }
        },

        updateStyle: function (item, newStyle) {
            this.revertStyle(item);
            this.saveAndApplyStyle(item, newStyle);
        },

        updateRowStyles: function (from, to) {
            var cells = this.visibleCells;

            for (var vr = from, dr = this.firstVisibleRow + from; vr < to; ++dr, ++vr) {
                this.updateStyle(cells[vr], this.getRowStyle(this.dataProvider.getRowId(dr)));
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
                    var cell = cells[vr][vc];
                    cell.renderer.updateData(this, dr, columns[dc]);
                    // apply user cell style
                    if (this.getCellStyle) {
                        this.updateStyle(cell, this.getCellStyle(this.dataProvider.getRowId(dr), columns[dc]));
                    }
                }
            }

            if (this.dirtyCellCount > 0) {
                this.dirtyCellCount = 0;
                this.dirtyCells = { };
            }
        },

        scrollTo: function (x, y) {
//            x = x || 0;
//            y = y || 0;
            this.vScrollTo(y);
            this.hScrollTo(x);
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

            if (hlRow) Adapter.addClass(hlRow, 'hover');
        }


    };

    return GridView;
});
