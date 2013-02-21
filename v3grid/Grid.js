define('v3grid/Grid',
    ['v3grid/Adapter', 'v3grid/Utils', 'v3grid/GridView', 'v3grid/DragHelper', 'v3grid/DefaultItemRenderer', 'v3grid/ColumnManager', 'v3grid/Scrollbar'],
    function (Adapter, Utils, GridView, DragHelper, DefaultItemRenderer, ColumnManager, Scrollbar) {

        var Grid = function (config) {
            this.initProperties(config);
            this.validateConfig(config);
            this.initFeatures(config);

            Adapter.merge(this, config);

            this.createStyles();
            this.createColumnManager();
            this.createComponents();

            this.setSize(this.width, this.height);
            this.scrollTo();
        };

        Grid.prototype = {
            // static instance counter:
            instanceCnt: 0,

            rowHeight: 22,
            headerHeight: 22,
            defaultColumnWidth: 100,
            defaultColumnMinWidth: 20,

            itemRenderer: DefaultItemRenderer,
            headerRenderer: DefaultItemRenderer,

            columnBatchSize: 5,
            rowBatchSize: 10,

            verticalSeparatorThickness: 1,
            horizontalSeparatorThickness: 1,

            verticalSeparatorColor: 'lightgrey',
            horizontalSeparatorColor: 'lightgrey',

            // user CSS classes:
            CLS_TABLE      : 'v3grid-table',
            CLS_HEADER_ROW : 'v3grid-header-row',
            CLS_ROW        : 'v3grid-row',
            CLS_COLUMN_MOVE: 'v3grid-column-move',
            CLS_HEADER_MOVE: 'v3grid-header-move',
            CLS_COLUMN_RES : 'v3grid-column-resize',
            CLS_HEADER_RES : 'v3grid-header-resize',

            initProperties: function (config) {
                var num = this.instanceNum = ++Grid.prototype.instanceCnt;

                // generated CSS classes
                this.CLS_CELL        = 'v3grid-' + num + '-cell';
                this.CLS_ROW_SIZE    = 'v3grid-' + num + '-row-size';
                this.CLS_HEADER_SIZE = 'v3grid-' + num + '-header-size';

                var container = Adapter.isString(config.renderTo) ?
                    document.getElementById(config.renderTo) : config.renderTo;

                this.panel = container; //document.createElement('div');
                this.panel.tabIndex = 0;
//                container.appendChild(this.panel);

                this.width = config.width || container.clientWidth;
                this.height = config.height || container.clientHeight;
                this.data = config.data;
            },

            validateConfig: function (config) {
                config.columns = config.columns || [];
                config.totalColumnCount = config.columns.length;
                config.getData = config.getData || this.getData;
                config.totalRowCount = config.totalRowCount  || (config.data ? config.data.length : 0);
            },

            initFeatures: function (config) {
                var features = config.features;
                if (!Adapter.isArray(features)) return;

                for (var len = features.length, i = 0; i < len; ++i) if (Adapter.isFunction(features[i].init)) {
                    features[i].init(this, config);
                }

                for (i = len-1; i >= 0; --i) if (Adapter.isFunction(features[i].initRev)) {
                    features[i].initRev(this, config);
                }
            },

            createStyles: function () {
                var num = this.instanceNum;

                var rules = [
                    Utils.cssEncode(this.CLS_CELL, {
                        height     : '100%',
                        overflow   : 'hidden',
                        position   : 'absolute',
                        borderColor: this.horizontalSeparatorColor + ' ' + this.verticalSeparatorColor,
                        borderStyle: 'solid',
                        borderWidth: '0px 0px '+this.horizontalSeparatorThickness+'px '+this.verticalSeparatorThickness+'px',
                        zIndex     : 0,
                        "-moz-user-select":'none',
                        "-webkit-user-select": 'none',
                        "-user-select": 'none',
                        "-ms-user-select": 'none'
                    }),
                    Utils.cssEncode(this.CLS_ROW_SIZE, {
                        position: 'absolute',
                        overflow: 'hidden',
                        width   : '100%',
                        height  : this.rowHeight + 'px'
                    }),
                    Utils.cssEncode(this.CLS_HEADER_SIZE, {
                        position: 'absolute',
                        overflow: 'hidden',
                        width   : '100%',
                        height  : this.headerHeight + 'px'
                    }),
                    '.' +this.CLS_ROW_SIZE+'.locked { left: 0px; }'
                ];

                this.styleSheet = Adapter.createStyleSheet(rules.join(''), 'v3grid-' + num + '-style');
                this.headerCSSRule = Adapter.getCSSRule(this.styleSheet, '.' + this.CLS_HEADER_SIZE);
            },

            destroy: function () {
                Adapter.removeStyleSheet('v3grid-' + this.instanceNum + '-style');
            },

            // not real GUID, but I just need a big random number
            generateUID: function () {
                //this gives 4x32 = 128 random bits
                var r1 = Math.random()*0x100000000,
                    r2 = Math.random()*0x100000000,
                    r3 = Math.random()*0x100000000,
                    r4 = Math.random()*0x100000000;

                // make it compact => base 36 (0..9, a..z) encoding
                return r1.toString(36) + r2.toString(36) + r3.toString(36) + r4.toString(36);
            },

            registerRendererType: function (obj, availRenderers) {
                var type = obj['-v3grid-type-id'] || (obj['-v3grid-type-id'] = this.generateUID());
                availRenderers[type] = availRenderers[type] || [];
            },

            addColumn: function (idx, config) {
                this.fixColumnConfig(idx, config);
                this.colMgr.addColumn(idx, config);
            },

            fixColumnConfig: function (idx, col) {
                var availRenderers = this.availableRenderers; //[name]= []

                col.dataIndex = col.dataIndex || idx;
                col.header = col.header || col.dataIndex;

                // renderer
                var rend = col.renderer || this.itemRenderer;
                col.renderer = Adapter.getClass(rend);
                if (!col.renderer) Adapter.error("Could not load renderer '"+rend+"' for column '"+col.dataIndex+"'");

                this.registerRendererType(col.renderer, availRenderers);

                // header renderer
                rend = col.headerRenderer || this.headerRenderer;
                col.headerRenderer = Adapter.getClass(rend);
                if (!col.headerRenderer) Adapter.error("Could not load header renderer '"+rend+"' for column '"+col.dataIndex+"'");

                this.registerRendererType(col.headerRenderer, availRenderers);

                col.width = col.width || this.defaultColumnWidth;
                col.minWidth = col.minWidth || this.defaultColumnMinWidth;

                col.resizable = col.resizable !== false;
                col.visible = col.visible !== false;
            },

            createColumnManager: function () {
                var columns = this.columns,
                    len = columns.length;

                this.availableRenderers = {};

                for (var i = 0; i < len; ++i) {
                    this.fixColumnConfig(i, columns[i]);
                }

                this.colMgr = new ColumnManager(this, columns);

                this.totalColumnCount = len;
            },


            getRenderer: function (renderer) {
                renderer = Adapter.getClass(renderer);
                if (!renderer.prototype.updateData) {
                    renderer.prototype.updateData = function (grid, row, column) { this.setData(grid.getData(row, column.dataIndex)); };
                }
                return renderer;
            },

            createComponents: function () {
//                var grid = this;

                var panel = this.panel;
                panel.style.position = 'relative';
                panel.style.overflow = 'hidden';
                panel.style.border = '1px solid gray';

                var headerColumnProps = { renderer: 'headerRenderer', rendererConfig: 'headerRendererConfig', finalCls: 'finalHeaderCls' };

                var leftLCC = this.leftLockedColumnCount;
                var rightLCC = this.rightLockedColumnCount;
                var topLRC = this.topLockedRowCount;
                var bottLRC = this.bottomLockedRowCount;
                var viewsH = this.viewsH = 1 + (leftLCC > 0) + (rightLCC > 0),
                    viewsV = this.viewsV = 2 + (topLRC > 0) + (bottLRC > 0),
                    scrollViewX = this.scrollViewX = 0 + (leftLCC > 0),
                    scrollViewY = this.scrollViewY = 1 + (topLRC > 0),
                    views = this.views = new Array(viewsV);    // views[y][x] = GridView

                var colMgr = this.colMgr;
                var ranges = [colMgr];
                if (viewsH > 1) {
                    var colCounts = [colMgr.columns.length];
                    if (rightLCC) { colCounts[0] -= rightLCC; colCounts.push(rightLCC); }
                    if (leftLCC) { colCounts[0] -= leftLCC; colCounts.unshift(leftLCC); }
                    ranges = colMgr.getRanges(colCounts);
                }

                var viewContainer = this.viewContainer = document.createElement('div');
                viewContainer.style.position = 'absolute';
                viewContainer.style.overflow = 'hidden';

                for (var y = 0; y < viewsV; ++y) {
                    views[y] = new Array(viewsH);

                    for (var x = 0; x < viewsH; ++x) {
                        // create div for the view
                        var table = document.createElement('div');
                        table.style.position = 'absolute';
                        table.style.overflow = 'hidden';

//                        var container = table;
                        Adapter.addClass(table, this.CLS_TABLE);    // TODO : locked, left/right/top/bottom/middle/center??

//                        if (x == scrollViewX || y == scrollViewY) {
                            var container = document.createElement('div');
                            container.style.position = 'absolute';
                            container.style.overflow = 'hidden';
                            container.appendChild(table);
//                        }

                        viewContainer.appendChild(container);

                        if (y == 0) {
                            // header view
                            views[0][x] = new GridView({
                                grid: this,
                                table: table,
                                container: container,
                                rowHeight: this.headerHeight,
                                colMgr: ranges[x],
                                totalRowCount: 1,
                                getData: function (row, col) { return this.columns[this.colMgr.columnMap[col]].header; },
                                getDataRowIdx: this.getDataRowIdx,
                                getVisibleRowIdx: this.getVisibleRowIdx,
                                availableRenderers: this.availableRenderers,
                                rowBatchSize: 1,
                                columnBatchSize: 1,
                                CLS_CELL       : this.CLS_CELL,
                                CLS_ROW_SIZE   : this.CLS_HEADER_SIZE,
                                CLS_ROW        : this.CLS_HEADER_ROW + ' locked',
                                columnProperties: headerColumnProps
                            });
                        } else {
                            views[y][x] = new GridView({
                                grid: this,
                                table: table,
                                container: container,
                                rowHeight: this.rowHeight,
                                colMgr: ranges[x],
                                totalRowCount: this.totalRowCount,
                                data: this.data,
                                getData: this.getData,
                                getDataRowIdx: this.getDataRowIdx,
                                getVisibleRowIdx: this.getVisibleRowIdx,
                                cellClicked: this.cellClicked,
                                availableRenderers: this.availableRenderers,
                                rowBatchSize: this.rowBatchSize,
                                columnBatchSize: this.columnBatchSize,
                                CLS_ROW        : this.CLS_ROW,
                                CLS_CELL       : this.CLS_CELL,
                                CLS_ROW_SIZE   : this.CLS_ROW_SIZE
                            });
                        }

                    }
                }

                panel.appendChild(viewContainer);

                // locked column stuff
//                if (this.lockedColumnCount > 0) {
//                    this.lockedHeader = document.createElement('div');
//                    this.lockedHeader.style.position = 'absolute';
//                    this.lockedHeader.style.overflow = 'hidden';
//
//                    this.lockedTableContainer = document.createElement('div');
//
//                    var ltcStyle = this.lockedTableContainer.style;
//                    ltcStyle.position = 'absolute';
//                    ltcStyle.overflow = 'hidden';
//                    ltcStyle.borderStyle = 'solid';
//                    ltcStyle.borderColor = this.verticalSeparatorColor;
//                    ltcStyle.borderWidth = '0px ' + this.verticalSeparatorThickness + 'px 0px 0px';
//
//                    this.lockedTable = document.createElement('div');
//
//                    this.lockedTable.style.position = 'absolute';
//                    this.lockedTable.style.overflow = 'hidden';
//                    Adapter.addClass(this.lockedTableContainer, this.CLS_TABLE + ' locked');
//
//                    this.lockedTableContainer.appendChild(this.lockedTable);
//                }
//
//                this.headerContainer = document.createElement('div');
//                this.headerContainer.style.position = 'absolute';
//                this.headerContainer.style.overflow = 'hidden';
//                this.header = document.createElement('div');
//                this.header.style.position = 'absolute';
//                this.headerContainer.appendChild(this.header);
//
//                if (!Adapter.hasTouch) Adapter.addListener(this.header, 'mousemove', this.colResizeCursorHandler, this);

//                new DragHelper({
//                    element: this.header,
//                    scope: this,
//                    dragStart: this.onHeaderDragStart,
//                    dragEnd: this.onHeaderDragEnd,
//                    dragMove: this.onHeaderDragging,
//                    endDragOnLeave: false,
//                    captureMouse: true,
//                    startDragOnDown: false,
//                    tolerance: 3
//                });


                // hover stuff
                if (Adapter.hasTouch) {
//            Adapter.addListener(this.table, 'touchstart', this.mouseMoveHandler, this);
//            Adapter.addListener(this.lockedTable, 'touchstart', this.mouseMoveHandler, this);
//            Adapter.addListener(this.table, 'touchend', this.mouseOutHandler, this);
//            Adapter.addListener(this.lockedTable, 'touchend', this.mouseOutHandler, this);
                } else {
                    this.scrollPosX = this.scrollPosY = 0;
                    var hScrollbar = this.hScrollbar = new Scrollbar(panel, 'horizontal');
                    var vScrollbar = this.vScrollbar = new Scrollbar(panel, 'vertical');


                    // TODO: use onHscroll/onVscroll instead
                    Adapter.addListener(hScrollbar.dom, 'scroll', function (evt) {
                        this.scrollTo(hScrollbar.dom.scrollLeft, this.scrollPosY);
                    }, this);

                    Adapter.addListener(vScrollbar.dom, 'scroll', function (evt) {
                        this.scrollTo(this.scrollPosX, vScrollbar.dom.scrollTop);
                    }, this);

                    if (Adapter.isFireFox) {
                        Adapter.addListener(viewContainer, 'DOMMouseScroll', this.ffMouseWheelHandler, this);
                    } else if (Adapter.isIE) {
                        Adapter.addListener(viewContainer, 'mousewheel', this.ieMouseWheelHandler, this);
                    } else {
                        Adapter.addListener(viewContainer, 'mousewheel', this.mouseWheelHandler, this);
                    }

                    Adapter.addListener(viewContainer, 'mousemove', this.mouseMoveHandler, this);
                    Adapter.addListener(viewContainer, 'mouseover', this.mouseMoveHandler, this);
                    Adapter.addListener(viewContainer, 'mouseout', this.mouseOutHandler, this);
                }
            },

            ffMouseWheelHandler: function (evt) {
                var delta = 40*evt.detail;
                if (evt.axis == 2) {
                    this.scrollTo(this.scrollPosX, this.scrollPosY + delta);
                } else {
                    this.scrollTo(this.scrollPosX + delta, this.scrollPosY);
                }
            },
            ieMouseWheelHandler: function (evt) {
                this.scrollTo(this.scrollPosX, this.scrollPosY - evt.wheelDelta);
            },
            mouseWheelHandler: function (evt) {
                this.scrollTo(this.scrollPosX - evt.wheelDeltaX, this.scrollPosY - evt.wheelDeltaY);
            },

            initiScroll: function () {
                var me = this;

                this.iScroll = new iScroll(this.tableContainer, {
                    extraEventEl: this.lockedTable,
                    onMoved: function (x, y) {
                        me.iScrollMove(x, y);
                    },
                    onBeforeScrollStart: null,
                    onBeforeScrollMove: function (e) { e.preventDefault(); },
                    useTransition:false,
                    bounce: true,
                    hLinked: this.header,
                    vLinked: this.lockedTable
                    // doesn't work!?
//            hScrollbar: true,
//            vScrollbar: true
                });

            },

            iScrollMove: function (x, y) {
                this.scrollTo(-x, -y);
            },

            // from/to values are inclusive
            allViews: function (funcName, args, yFrom, yTo, xFrom, xTo) {
                var views = this.views;

                // default values
                if (yFrom === undefined) yFrom = 0;
                if (xFrom === undefined) xFrom = 0;
                if (yTo === undefined) yTo = this.viewsV-1;
                if (xTo === undefined) xTo = this.viewsH-1;

                for (var y = yFrom; y <= yTo; ++y) {
                    var viewsY = views[y];
                    for (var x = xFrom; x <= xTo; ++x) {
                        viewsY[x][funcName].apply(viewsY[x], args || []);
                    }
                }
            },

            colResizeCursorHandler: function (evt) {
                Adapter.fixPageCoords(evt);
                var hView = this.headerView,
                    posx = evt.pageX - Adapter.getPageX(this.header),
                    colIdx = hView.getColumnIdx(posx),
                    curVal = '';

                posx -= hView.posX[colIdx];
                if ((posx < 5 ? --colIdx >= 0 : posx > hView.columns[colIdx].actWidth - 5) &&
                    hView.columns[colIdx].resizable) curVal = 'col-resize';

                if (this.lastHeaderCursor !== curVal) {
                    this.lastHeaderCursor = curVal;
                    this.headerCSSRule.style.cursor = curVal;
                }
            },

            onHeaderDragStart: function (evt) {
                var columns = this.headerView.columns,
                    headerX = evt.pageX - Adapter.getPageX(this.header),
                    colIdx = this.headerView.getColumnIdx(headerX),
                    posOffset = headerX - this.headerView.columnPosX[colIdx],
                    colWidth = columns[colIdx].actWidth,
                    tolerance = Adapter.hasTouch ? 10 : 5;

                this.dragColResize = true;
                if (posOffset < tolerance && colIdx > 0) {
                    --colIdx;
                } else if (colWidth - posOffset < tolerance) {
                    posOffset -= colWidth;
                } else {
                    this.dragColResize = false;
                    this.dragColOffset = this.headerView.columnPosX[colIdx];
                }

                this.dragColIdx = colIdx;
                if (this.dragColResize) {
                    if (!columns[colIdx].resizable) return false;

                    this.dragColWidth = columns[colIdx].actWidth + posOffset;
                    this.resizeColumn(colIdx, this.dragColWidth);

                    this.headerView.addClassToColumn(this.CLS_HEADER_RES, colIdx);
                    this.tableView.addClassToColumn(this.CLS_COLUMN_RES, colIdx);
                } else {
                    this.headerView.addClassToColumn(this.CLS_HEADER_MOVE, colIdx);
                    this.tableView.addClassToColumn(this.CLS_COLUMN_MOVE, colIdx);
                }
            },

            onHeaderDragging: function (deltaX) {
                if (this.dragColResize) {
                    this.dragColWidth += deltaX;
                    this.resizeColumn(this.dragColIdx, this.dragColWidth);
                } else {
                    this.dragColOffset += deltaX;
                    this.dragColIdx = this.headerView.dragColumn(this.dragColIdx, this.dragColOffset);
                }
            },

            onHeaderDragEnd: function (evt) {
                var colIdx = this.dragColIdx;

                if (this.dragColResize) {
                    this.headerView.removeClassFromColumn(this.CLS_HEADER_RES, colIdx);
                    this.tableView.removeClassFromColumn(this.CLS_COLUMN_RES, colIdx);

                    this.setSize();
                } else {
                    Adapter.setXCSS(this.headerView.columns[colIdx].layoutRule, this.headerView.posX[colIdx]);
                    this.headerView.removeClassFromColumn(this.CLS_HEADER_MOVE, colIdx);
                    this.tableView.removeClassFromColumn(this.CLS_COLUMN_MOVE, colIdx);
                }
            },

            resizeColumn: function (colIdx, width) {
                var columns = this.normalColumns,
                    col = columns[colIdx],
                    minWidth = col.minWidth;

                if (width < minWidth) width = minWidth;

                var delta = width - col.actWidth;

                if (col.flex) {
                    col.flex = 0;
                    --this.flexColumnCount;
                }
                col.width = col.actWidth = width;

                var ncols = this.normalColumns;
                this.calcColumnPosX(ncols, this.tableView.columnPosX, colIdx+1, ncols.length);
                this.applyColumnStyles(ncols, this.tableView.columnPosX, colIdx, ncols.length-1);

                this.headerView.columnResized(delta);
                this.tableView.columnResized(delta);
            },

            copyVisibleColumn: function (fromIdx, toIdx) {
                this.tableView.copyVisibleColumn(fromIdx, toIdx);
                this.headerView.copyVisibleColumn(fromIdx, toIdx);
            },

            moveColumn: function (fromIdx, toIdx) {
                this.headerView.moveColumn(fromIdx, toIdx);
//                this.tableView.moveColumn(fromIdx, toIdx);

                if (toIdx < fromIdx) {
                    fromIdx ^= toIdx ^= fromIdx ^= toIdx;
                }

                this.calcColumnPosX(this.headerView.columns, this.headerView.columnPosX, fromIdx, toIdx);
                this.applyColumnStyles(this.headerView.columns, this.headerView.columnPosX, fromIdx, toIdx);
            },

//            dragColumn: function (colIdx, offset) {
//                var firstCol = this.tableView.firstVisibleColumn,
//                    ccolumns = this.columns,
//                    lColCount = this.lockedColumnCount,
//                    columns = this.normalColumns,
//                    columnsX = this.tableView.columnPosX,
//                    copyVisCol = this.copyVisibleColumn,
//
//                    colIdxMap = this.tableView.dataIdx2ColIdx,
//                    vLeft = offset,
//                    i, tmpCol, tmp2Col;
//
//                if (vLeft < columnsX[colIdx]) {
//                    tmpCol = columns[colIdx];
//                    tmp2Col = ccolumns[colIdx+lColCount];
//
//                    copyVisCol.call(this, colIdx-firstCol, -1);
//
//                    for (i = colIdx-1; i >=0 && vLeft < columnsX[i] + (columns[i].actWidth >> 1); --i) {
//                        colIdxMap[(columns[i+1] = columns[i]).dataIndex] = i+1;
//                        ccolumns[lColCount+i+1] = ccolumns[lColCount+i];
//                        copyVisCol.call(this, i-firstCol, i+1-firstCol);
//                    }
//                    ++i;
//                    if (i < colIdx) {
//                        colIdxMap[(columns[i] = tmpCol).dataIndex] = i;
//                        ccolumns[lColCount+i] = tmp2Col;
//                        copyVisCol.call(this, -1, i-firstCol);
//
//                        this.calcColumnPosX(this.normalColumns, this.tableView.columnPosX, i, colIdx);
//                        this.applyColumnStyles(this.normalColumns, this.tableView.columnPosX, i, colIdx);
//                        colIdx = i;
//                    }
//
//                } else {
//                    var vRight = vLeft + columns[colIdx].actWidth;
//                    tmpCol = columns[colIdx];
//                    tmp2Col = ccolumns[colIdx+lColCount];
//
//                    copyVisCol.call(this, colIdx-firstCol, -1);
//
//                    var totalCount = this.normalColumns.length;
//                    for (i = colIdx+1; i < totalCount && vRight > columnsX[i] + (columns[i].actWidth >> 1); ++i) {
//                        colIdxMap[(columns[i-1] = columns[i]).dataIndex] = i-1;
//                        ccolumns[lColCount+i-1] = ccolumns[lColCount+i];
//                        copyVisCol.call(this, i-firstCol, i-1-firstCol);
//                    }
//                    --i;
//                    if (colIdx < i) {
//                        colIdxMap[(columns[i] = tmpCol).dataIndex] = i;
//                        ccolumns[lColCount+i] = tmp2Col;
//                        copyVisCol.call(this, -1, i-firstCol);
//                        this.calcColumnPosX(this.normalColumns, this.tableView.columnPosX, colIdx, i);
//                        this.applyColumnStyles(this.normalColumns, this.tableView.columnPosX, colIdx, i);
//                        colIdx = i;
//                    }
//                }
//
//                Adapter.setXCSS('.'+columns[colIdx].layoutCls, offset);
//                return colIdx;
//            },

            setTableSize: function () {
                this.allViews('setTableSize');
                if (this.iScroll) this.iScroll.refresh();
            },

            setSize: function (width, height) {

                width = width === undefined ? this.width : width-2; // border
                height = height === undefined ? this.height : height-2; //

                if (width < 0 || height < 0) return;

                this.width = width;
                this.height = height;

                this.panel.style.width = width + 'px';
                this.panel.style.height = height + 'px';

                var headerHeight = this.headerHeight,
                    rowHeight = this.rowHeight;

                // calculate scrollbar visibility
                var availWidth = width,
                    availHeight = height - headerHeight,
                    totalHeight = this.totalRowCount * rowHeight,
                    isVscroll =  totalHeight > availHeight;
                if (isVscroll) availWidth -= Scrollbar.size;


                var colMgr = this.colMgr;
                colMgr.calcColumnWidths(availWidth);
                var totalWidth = colMgr.getTotalWidth(),
                    isHscroll = totalWidth > availWidth;

                if (isHscroll) {
                    availHeight -= Scrollbar.size;
                    if (!isVscroll && totalHeight > availHeight) {
                        isVscroll = true;
                        availWidth -= Scrollbar.size;
                        // don't need to recalc column widths, because if they didn't fit within 'availWidth',
                        // they won't fit within 'availWidth-Scrollbar.size', so all columns will have fixed/min width
                    }
                }

                // sets inner table sizes
                this.setTableSize();

                var leftLCC = this.leftLockedColumnCount,
                    rightLCC = this.rightLockedColumnCount,
                    topLRC = this.topLockedRowCount,
                    bottLRC = this.bottomLockedRowCount,
                    viewsV = this.viewsV,
                    viewsH = this.viewsH;

                if (availWidth < 0) availWidth = 0;
                var scrollbarWidth = availWidth;

                var widths = [availWidth];
                if (viewsH > 1) {
                    var w;
                    if (leftLCC) {
                        w = Math.min(colMgr.ranges[0].getTotalWidth(), availWidth);
                        availWidth -= w;
                        widths = [w, availWidth];
                    }
                    if (rightLCC) {
                        w = Math.min(colMgr.ranges[viewsH-1].getTotalWidth(), availWidth);
                        widths[widths.length-1] -= w;
                        widths.push(w);
                    }
                }

                // headerHeight is already subtracted from avail
                if (availHeight < 0) { headerHeight += availHeight; availHeight = 0; }
                var scrollbarHeight = availHeight;

                var heights = [headerHeight, availHeight];
                if (viewsV > 2) {
                    var h;
                    if (topLRC) {
                        h = Math.min(topLRC * rowHeight, availHeight);
                        availHeight -= h;
                        heights = [headerHeight, h, availHeight];
                    }
                    if (bottLRC) {
                        h = Math.min(bottLRC * rowHeight, availHeight);
                        heights[heights.length-1] -= h;
                        heights.push(h);
                    }
                }

                // set container positions & sizes
                var views = this.views,
                    yPos = 0, xPos;

                for (var y = 0; y < viewsV; ++y) {
                    var viewsY = views[y];
                    xPos = 0;
                    for (var x = 0; x < viewsH; ++x) {
                        viewsY[x].setVisibleBox(xPos, yPos, widths[x], heights[y]);
                        xPos += widths[x];
                    }
                    yPos += heights[y];
                }

                // note: xPos, yPos contains the correct scrollbar positions
                this.hScrollbar.setProperties(0, yPos, isHscroll ? scrollbarWidth : 0, totalWidth);
                this.vScrollbar.setProperties(xPos, headerHeight, isVscroll ? scrollbarHeight : 0, totalHeight);

                this.maxScrollX = Math.max(0, totalWidth - scrollbarWidth);
                this.maxScrollY = Math.max(0, totalHeight - scrollbarHeight);

//                this.tableWidth = scrollbarWidth;
//                this.tableHeight = scrollbarHeight;

                this.viewContainer.style.width = scrollbarWidth + 'px';
                this.viewContainer.style.height = (scrollbarHeight + headerHeight) + 'px';
//                console.log('setsize scrollMax', this.maxScrollX, this.maxScrollY);

                if (this.iScroll) this.iScroll.refresh();
//                console.log('size', this.tableWidth, this.tableHeight, visibleWidth, visibleHeight);
            },

//            getColumnIdx: function (dataIdx) {
//                var idx;
//
//                if (this.lockedColumnCount > 0) idx = this.lockedTableView.dataIdx2ColIdx[dataIdx];
//                if (idx !== undefined) return idx;
//
//                idx = this.tableView.dataIdx2ColIdx[dataIdx];
//
//                return idx !== undefined ? idx + this.lockedColumnCount : -1;
//            },

            setColumnVisible: function (colDataIdx, visible) {
                var idx = this.colMgr.columnMap[colDataIdx];

                if (idx == -1 || this.colMgr.columns[idx].visible == visible) return;

                this.colMgr.columns[idx].visible = visible;
                //this.columnsChanged = true;
                this.setSize();

                var lColCnt = this.lockedColumnCount;
                if (idx < lColCnt) {
                    this.lockedHeaderView.updateColumn(idx);
                    this.lockedTableView.updateColumn(idx);
                } else {
                    idx -= lColCnt;
                    this.headerView.updateColumn(idx);
                    this.tableView.updateColumn(idx);
                }
            },

            updateView: function () {
                this.allViews('updateView');
            },

            scrollTo: function (x, y) {
                if (x === undefined) x = this.scrollPosX;
                if (y === undefined) y = this.scrollPosY;

                x = Utils.minMax(x, 0, this.maxScrollX);
                y = Utils.minMax(y, 0, this.maxScrollY);

                this.scrollPosX = x;
                this.scrollPosY = y;

                // set scrollbar positions
                this.hScrollbar.dom.scrollLeft = x;
                this.vScrollbar.dom.scrollTop = y;

                var scrollViewX = this.scrollViewX,
                    scrollViewY = this.scrollViewY,
                    views = this.views;

                for (var yLen = views.length, vy = 0; vy < yLen; ++vy) {
                    var viewsY = views[vy];
                    for (var xLen = viewsY.length, vx = 0; vx < xLen; ++vx) {
                        viewsY[vx].scrollTo(vx == scrollViewX ? x : 0, vy == scrollViewY ? y : 0);
                    }
                }
            },

            setTotalRowCount: function (rowCount) {
                this.totalRowCount = rowCount;
                // TODO: subtract the locked rows
                this.allViews('setTotalRowCount', [rowCount], this.scrollViewY, this.scrollViewY);

                // TODO: figure out what is needed here from setSize (not all I think)
                this.setSize();
                this.scrollTo();    // needed because filtering...
//                if (this.iScroll) this.iScroll.refresh();
            },

            getData: function (row, col) {
                return this.data[row][col];
            },

            // visibleRowIdx -> dataRowIdx
            getDataRowIdx: Utils.identity,

            // dataRowIdx -> visibleRowIdx
            // may return -1 if the row is not visible (filtered out for example)
            getVisibleRowIdx: Utils.identity,

            setData:function (row, col, data) {
                var old = this.data[row][col];
                if (old !== data)  {
                    this.data[row][col] = data;
                    this.invalidateData(row, col);
                }
            },

            invalidateData:function (row, col) {
                // TODO: views
//                if (this.lockedColumnCount > 0) this.lockedTableView.invalidateData(row, col);
//                this.tableView.invalidateData(row, col);
            },

            mouseMoveHandler: function (evt) {
                Adapter.fixPageCoords(evt);
                this.allViews('mouseIsOver', [evt.pageX, evt.pageY], 1);
            },

            mouseOutHandler: function () {
                this.allViews('mouseIsOver', [-1, -1], 1);
            }
        };

        return Grid;
    }
);
