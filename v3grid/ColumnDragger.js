define('v3grid/ColumnDragger',
    ['v3grid/Adapter', 'v3grid/Utils', 'v3grid/DragHelper'],
    function (Adapter, Utils, DragHelper) {

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
                    view.correctTargetPos = this.correctTargetPos;

                    view.dragHelper = new DragHelper({
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
                        view.colMgr.addListener('columnResizeStart', this.resizeStarted, view);
                        view.colMgr.addListener('columnResizeEnd', this.resizeEnded, view);
                    }
                }
            },

            dragStarted: function (colIdx) {
                this.addClassToColumn(this.CLS_COLUMN_MOVE, colIdx);
            },

            dragEnded: function (colIdx) {
                this.removeClassFromColumn(this.CLS_COLUMN_MOVE, colIdx);
            },

            resizeStarted: function (colIdx) {
                this.addClassToColumn(this.CLS_COLUMN_RES, colIdx);
            },

            resizeEnded: function (colIdx) {
                this.removeClassFromColumn(this.CLS_COLUMN_RES, colIdx);
            },

            // called on the view
            colResizeCursorHandler: function (evt) {
                Adapter.fixPageCoords(evt);
                var posx = evt.pageX - Adapter.getPageX(this.table),
                    colIdx = this.getColumnIdx(posx),
                    curVal = '';

                posx -= this.columnsX[colIdx];
                if (posx < 5 ? --colIdx >= 0 : posx > this.columns[colIdx].actWidth - 5) {
                    if (this.columns[colIdx].resizable) curVal = 'col-resize';
                    else curVal = 'not-allowed';
                }

//                console.log('colResize mousemove', posx, colIdx, curVal);

                if (this.grid.lastHeaderCursor !== curVal) {
                    this.grid.lastHeaderCursor = curVal;
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
                    this.colMgr.fireEvent('columnResizeStart', colIdx);
                    this.colMgr.resizeColumn(colIdx, this.dragColWidth);
                } else {
                    this.colMgr.fireEvent('columnDragStart', colIdx);
                }
            },

            onHeaderDragging: function (deltaX) {
//                console.log('drag', deltaX);

                if (this.dragColResize) {
                    this.dragColWidth += deltaX;
                    this.colMgr.resizeColumn(this.dragColIdx, this.dragColWidth);
                } else {
                    this.dragColOffset += deltaX;
                    this.dragColIdx = this.dragColumn(this.dragColIdx, this.dragColOffset);
                }
            },

            onHeaderDragEnd: function (evt) {
                var colIdx = this.dragColIdx;

                if (this.dragColResize) {
                    this.colMgr.fireEvent('columnResizeEnd', colIdx);
                    this.grid.setSize();
                } else {
                    if (this.autoScroll !== undefined) {
                        Utils.cancelFrame.call(window, this.autoScroll);
                        this.autoScroll = undefined;
                    }
                    this.colMgr.fireEvent('columnDragEnd', colIdx);
                    Adapter.setXCSS(this.columns[colIdx].layoutRule, this.columnsX[colIdx]);
                }
            },

            dragColumn: function (colIdx, pos) {
                var columns = this.columns,
                    columnsX = this.columnsX,
                    first = this.firstVisibleColumn,
                    targetIdx;

                // figure out if it is being moved to left or right
                // then the target column index
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

//                console.log('draggin', pos, colIdx, targetIdx, columnsX[colIdx], columnsX[targetIdx]);

                if (colIdx !== targetIdx) {
                    this.colMgr.moveColumn(colIdx, targetIdx);
                }
                Adapter.setXCSS(columns[targetIdx].layoutRule, pos);

                // autoscroll the grid if the dragged column is at one of the ends
                if (!this.isLocked) {
                    if (this.autoScroll !== undefined) {
                        Utils.cancelFrame.call(window, this.autoScroll);
                        this.autoScroll = undefined;
                    }

                    var target;

                    if ((target = pos) < this.lastHScrollPos ||
                        (target = pos + columns[targetIdx].actWidth - this.visibleWidth) > this.lastHScrollPos) {
                        var me = this;

                        this.autoScroll = Utils.nextFrame.call(window, function () {
                            var delta = me.lastHScrollPos;
                            me.grid.hScrollTo(me.correctTargetPos(target, me.dragColIdx));
                            delta = me.lastHScrollPos - delta;
                            me.dragColOffset += delta;
                            me.dragColIdx = me.dragColumn(me.dragColIdx, me.dragColOffset);
                        });
                    }
                }

                return targetIdx;
            },

            // corrects the scroll target position, so that the 'viewport' contains column colIdx after the scroll
            correctTargetPos: function (pos, colIdx) {
                var colX = this.columnsX[colIdx],
                    target;

                if ((target = colX - this.visibleWidth) >= pos) {
                    pos = target+1;
                } else if ((target = colX + this.columns[colIdx].actWidth) <= pos) {
                    pos = target-1;
                }
                return pos;
            }
        };

        return ColumnDragger;
    }
);