define('v3grid/ColumnDragger',
    ['v3grid/Adapter', 'v3grid/DragHelper'],
    function (Adapter, DragHelper) {

        var ColumnDragger = function () {

        };

        ColumnDragger.prototype = {
            init: function (grid, config) {
                var origCreateComp = grid.createComponents,
                    dragger = this;

                this.grid = grid;

                grid.createComponents = function () {
                    origCreateComp.call(this);
                    dragger.attachHandlers();
                }
            },

            attachHandlers: function () {
                var grid = this.grid,
                    views = grid.views,
                    header = views[0],
                    viewsH = grid.viewsH,
                    viewsV = grid.viewsV;

                for (var x = 0; x < viewsH; ++x) {
                    var view = header[x];
                    Adapter.addListener(view.table, 'mousemove', this.colResizeCursorHandler, view);
                    view.dragColumn = this.dragColumn;
                    new DragHelper({
                        element: view.table,
                        scope: view,
                        dragStart: this.onHeaderDragStart,
                        dragEnd: this.onHeaderDragEnd,
                        dragMove: this.onHeaderDragging,
                        endDragOnLeave: false,
                        captureMouse: true,
                        startDragOnDown: false,
                        tolerance: 3
                    });

                    for (var y = 0; y < viewsV; ++y) {
                        view = views[y][x];
                        view.colMgr.addListener('columnDragStart', this.dragStarted, view);
                        view.colMgr.addListener('columnDragEnd', this.dragEnded, view);
                    }
                }
            },

            dragStarted: function (colIdx) {
                this.addClassToColumn(this.CLS_COLUMN_MOVE, colIdx);
            },

            dragEnded: function (colIdx) {
                this.removeClassFromColumn(this.CLS_COLUMN_MOVE, colIdx);
            },

            // called on the view
            colResizeCursorHandler: function (evt) {
                Adapter.fixPageCoords(evt);
                var posx = evt.pageX - Adapter.getPageX(this.table),
                    colIdx = this.getColumnIdx(posx),
                    curVal = '';

                posx -= this.columnsX[colIdx];
                if ((posx < 5 ? --colIdx >= 0 : posx > this.columns[colIdx].actWidth - 5) &&
                    this.columns[colIdx].resizable) curVal = 'col-resize';

//            console.log('colResize mousemove', posx, colIdx, curVal);

                if (this.lastHeaderCursor !== curVal) {
                    this.lastHeaderCursor = curVal;
                    this.grid.headerCSSRule.style.cursor = curVal;
                }
            },

            onHeaderDragStart: function (evt) {
                var columns = this.columns,
                    headerX = evt.pageX - Adapter.getPageX(this.table),
                    colIdx = this.getColumnIdx(headerX),
                    posOffset = headerX - this.columnsX[colIdx],
                    colWidth = columns[colIdx].actWidth,
                    tolerance = Adapter.hasTouch ? 10 : 5;

                this.dragColResize = true;
                if (posOffset < tolerance && colIdx > 0) {
                    --colIdx;
                } else if (colWidth - posOffset < tolerance) {
                    posOffset -= colWidth;
                } else {
                    this.dragColResize = false;
                    this.dragColOffset = this.columnsX[colIdx];
                }

                this.dragColIdx = colIdx;
                if (this.dragColResize) {
                    if (!columns[colIdx].resizable) return false;

                    this.dragColWidth = columns[colIdx].actWidth + posOffset;
//                    this.resizeColumn(colIdx, this.dragColWidth);

//                    this.headerView.addClassToColumn(this.CLS_HEADER_RES, colIdx);
//                    this.tableView.addClassToColumn(this.CLS_COLUMN_RES, colIdx);
                } else {
                    this.colMgr.fireEvent('columnDragStart', colIdx);
                }
            },

            onHeaderDragging: function (deltaX) {
                if (this.dragColResize) {
                    this.dragColWidth += deltaX;
//                    this.resizeColumn(this.dragColIdx, this.dragColWidth);
                } else {
                    this.dragColOffset += deltaX;
                    this.dragColIdx = this.dragColumn(this.dragColIdx, this.dragColOffset);
                }
            },

            onHeaderDragEnd: function (evt) {
                var colIdx = this.dragColIdx;

                if (this.dragColResize) {
//                    this.headerView.removeClassFromColumn(this.CLS_HEADER_RES, colIdx);
//                    this.tableView.removeClassFromColumn(this.CLS_COLUMN_RES, colIdx);

                    this.grid.setSize();
                } else {
                    this.colMgr.fireEvent('columnDragEnd', colIdx);
                    Adapter.setXCSS(this.columns[colIdx].layoutRule, this.columnsX[colIdx]);
                }
            },

            dragColumn: function (colIdx, pos) {
                var columns = this.columns,
                    columnsX = this.columnsX,
                    first = this.firstVisibleColumn,
                    targetIdx;

                if (pos < columnsX[colIdx]) {
                    targetIdx = this.searchColumn(pos, first, colIdx/*-1 ?*/);
                    if (targetIdx < columns.length-1 &&
                        pos > columnsX[targetIdx] + (columns[targetIdx].actWidth >> 1)) ++targetIdx;
                } else {
                    var rightPos = pos + columns[colIdx].actWidth;
                    targetIdx = this.searchColumn(rightPos, colIdx /*+1 ?*/, first + this.visibleColumnCount);
                    if (targetIdx > 0 &&
                        rightPos < columnsX[targetIdx] + (columns[targetIdx].actWidth >> 1)) --targetIdx;
                }

//            console.log('draggin', pos, colIdx, targetIdx, columnsX[colIdx], columnsX[targetIdx]);

                if (colIdx !== targetIdx) {
                    this.colMgr.moveColumn(colIdx, targetIdx);
                }
                Adapter.setXCSS(columns[targetIdx].layoutRule, pos);

                return targetIdx;
            }


        };

        return ColumnDragger;
    }
);