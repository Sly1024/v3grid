define('v3grid/Grid',
    ['v3grid/Adapter', 'v3grid/Utils', 'v3grid/GridView', 'v3grid/DragHelper', 'v3grid/DefaultItemRenderer'],
    function (Adapter, Utils, GridView, DragHelper, DefaultItemRenderer) {

        var Grid = function (config) {
            this.initProperties(config);
            this.validateConfig(config);
            this.initFeatures(config);

            Adapter.merge(this, config);

            this.createStyles();
            this.fixColumnConfigs();
            this.validateColumnWidths();
            this.createComponents();
            this.genViewCols();

            this.setSize(this.width, this.height);
            this.scrollTo();
        };

        Grid.prototype = {
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

            // CSS class constants:
            CLS_TABLE      : 'v3grid-table',
            CLS_HEADER_ROW : 'v3grid-header-row',
            CLS_HEADER_SIZE: 'v3grid-header-size',
            CLS_CELL       : 'v3grid-cell',
            CLS_ROW        : 'v3grid-row',
            CLS_ROW_SIZE   : 'v3grid-row-size',
            CLS_COLUMN_MOVE: 'v3grid-column-move',
            CLS_HEADER_MOVE: 'v3grid-header-move',
            CLS_COLUMN_RES : 'v3grid-column-resize',
            CLS_HEADER_RES : 'v3grid-header-resize',

            initProperties: function (config) {
                var container = Adapter.isString(config.renderTo) ?
                    document.getElementById(config.renderTo) : config.renderTo;

                this.panel = document.createElement('div');
                this.panel.tabIndex = 0;
                container.appendChild(this.panel);

                this.width = config.width || container.clientWidth;
                this.height = config.height || container.clientHeight;

                this.columnsChanged = true;
            },

            validateConfig: function (config) {
                config.columns = config.columns || [];
                config.totalColumnCount = config.columns.length;
                this.totalRowCount = config.totalRowCount || (config.totalRowCount = (config.data ? config.data.length : 0));
            },

            initFeatures: function (config) {
                var features = config.features;
                if (!Adapter.isArray(features)) return;

                for (var len = features.length, i = 0; i < len; ++i) {
                    features[i].init(this, config);
                }
            },

            createStyles: function () {

                function cssEncode(cssClass, obj) {
                    return '.' + cssClass + '{' + Utils.styleEncode(obj) + '}';
                }

                var rules = [
                    cssEncode(this.CLS_CELL, {
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
                    })
                ];

                var columns = this.columns;
                for (var c = 0, len = columns.length; c < len; ++c) {
                    var col = columns[c], clsName,
                        finalCls = [], finalHeaderCls = [];

                    // user specified cls/headerCls
                    if (col.cls) finalCls.push(col.cls);
                    if (col.headerCls) finalHeaderCls.push(col.headerCls);

                    // user specified style/headerStyle
                    if (col.style) {
                        clsName = 'v3grid-column'+c+'-user';
                        rules.push(cssEncode(clsName, col.style));
                        finalCls.push(clsName);
                    }

                    if (col.headerStyle) {
                        clsName = 'v3grid-header-'+c+'-user';
                        rules.push(cssEncode(clsName, col.headerStyle));
                        finalHeaderCls.push(clsName);
                    }

                    // generated layout classes
                    clsName = 'v3grid-column'+c+'-layout';
                    finalCls.push(col.layoutCls = clsName);
                    finalHeaderCls.push(clsName);
                    rules.push('.'+clsName+'{}');

                    col.finalCls = finalCls.join(' ');
                    col.finalHeaderCls = finalHeaderCls.join(' ');
                }

                rules.push(cssEncode(this.CLS_ROW_SIZE, {
                    position: 'absolute',
                    overflow: 'hidden',
                    width   : '100%',
                    height  : this.rowHeight + 'px'
                }));

                rules.push('.' +this.CLS_ROW_SIZE+'.locked { left: 0px; }');

                rules.push(cssEncode(this.CLS_HEADER_SIZE, {
                    position: 'absolute',
                    overflow: 'hidden',
                    width   : '100%',
                    height  : this.headerHeight + 'px'
                }));

                // TODO: remove when grid is destroyed!
                this.styleID = this.generateUID();
                Adapter.createStyleSheet(rules.join(''), 'v3grid-style-' + this.styleID);

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

            fixColumnConfigs: function () {
                var availRenderers = this.availableRenderers = {}; //[name]= []

                for (var colcount = this.columns.length, idx = 0; idx < colcount; ++idx) {
                    var col = this.columns[idx];

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
                }

                this.totalColumnCount = this.columns.length;

                // check for lockedColumns
                this.lockedColumnCount = Utils.minMax(this.lockedColumnCount >> 0, 0, this.totalColumnCount);

                this.lockedColumns = [];
                this.normalColumns = [];
            },

            genViewCols: function () {
                var columns = this.columns, lcols = this.lockedColumns, li = 0;
                for (var len = this.lockedColumnCount, i = 0; i < len; ++i) {
                    lcols[li++] = columns[i];
                }
                lcols.length = li;
                this.lockedTableView.generateDataIdx2ColIdx();

                var ncols = this.normalColumns, ni = 0;
                for (var len = this.totalColumnCount; i < len; ++i) {
                    ncols[ni++] = columns[i];
                }
                ncols.length = ni;
                this.tableView.generateDataIdx2ColIdx();
            },

            validateColumnWidths: function () {
                var columns = this.columns,
                    flexCount = 0;

                for (var len = this.totalColumnCount, i = 0; i < len; ++i) {
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
                if (this.flexColumnCount == 0) return;

                var columns = this.columns,
                    fixTotal = 0, fixMin = 0,
                    flexTotal = 0, flexMin = 0,
                    count = this.totalColumnCount,
                    flexCols = [], i,
                    changed = false;

                for (i = 0; i < count; ++i) {
                    var col = columns[i];
                    if (!col.visible) {
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

                if (changed) this.columnsChanged = true;
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

                var headerColumnProps = { renderer: 'headerRenderer', rendererConfig: 'headerRendererConfig', finalCls: 'finalHeaderCls' };

                // locked column stuff
                if (this.lockedColumnCount > 0) {
                    this.lockedHeader = document.createElement('div');
                    this.lockedHeader.style.position = 'absolute';
                    this.lockedHeader.style.overflow = 'hidden';

                    this.lockedTableContainer = document.createElement('div');

                    var ltcStyle = this.lockedTableContainer.style;
                    ltcStyle.position = 'absolute';
                    ltcStyle.overflow = 'hidden';
                    ltcStyle.borderStyle = 'solid';
                    ltcStyle.borderColor = this.verticalSeparatorColor;
                    ltcStyle.borderWidth = '0px ' + this.verticalSeparatorThickness + 'px 0px 0px';

                    this.lockedTable = document.createElement('div');

                    this.lockedTable.style.position = 'absolute';
                    this.lockedTable.style.overflow = 'hidden';

                    this.lockedTableView = new GridView({
                        grid: this,
                        table: this.lockedTable,
                        rowHeight: this.rowHeight,
                        columns: this.lockedColumns,
                        totalRowCount: this.totalRowCount,
                        data: this.data,
                        getData: this.getData,
                        availableRenderers: this.availableRenderers,
                        rowBatchSize: this.rowBatchSize,
                        columnBatchSize: this.columnBatchSize,
                        CLS_ROW        : this.CLS_ROW + ' locked',
                        CLS_CELL       : this.CLS_CELL,
                        CLS_ROW_SIZE   : this.CLS_ROW_SIZE
                    });

                    this.lockedHeaderView = new GridView({
                        grid: this,
                        table: this.lockedHeader,
                        rowHeight: this.headerHeight,
                        columns: this.lockedColumns,
                        totalRowCount: 1,
                        getData: function (row, col) { return this.columns[this.dataIdx2ColIdx[col]].header; },
                        availableRenderers: this.availableRenderers,
                        rowBatchSize: 1,
                        columnBatchSize: 1,
                        CLS_CELL       : this.CLS_CELL,
                        CLS_ROW_SIZE   : this.CLS_HEADER_SIZE,
                        CLS_ROW        : this.CLS_HEADER_ROW + ' locked',
                        columnProperties: headerColumnProps,
                        columnPosX: this.lockedTableView.columnPosX,
                        dataIdx2ColIdx: this.lockedTableView.dataIdx2ColIdx
                    });

                    this.lockedTableContainer.appendChild(this.lockedTable);
                }

                this.headerContainer = document.createElement('div');
                this.headerContainer.style.position = 'absolute';
                this.headerContainer.style.overflow = 'hidden';
                this.header = document.createElement('div');
                this.header.style.position = 'absolute';
                this.headerContainer.appendChild(this.header);

                if (!Adapter.hasTouch) Adapter.addListener(this.header, 'mousemove', this.colResizeCursorHandler, this);

                new DragHelper({
                    element: this.header,
                    scope: this,
                    dragStart: this.onHeaderDragStart,
                    dragEnd: this.onHeaderDragEnd,
                    dragMove: this.onHeaderDragging,
                    endDragOnLeave: false,
                    captureMouse: true,
                    startDragOnDown: false,
                    tolerance: 3
                });


                this.tableContainer = document.createElement('div');

                this.tableContainer.style.position = 'absolute';
                this.tableContainer.style.overflow = 'auto'; // !!!!!!

                this.table = document.createElement('div');
                Adapter.addClass(this.table, this.CLS_TABLE);

                this.table.style.position = 'absolute';
                this.table.style.overflow = 'hidden';

                this.tableView = new GridView({
                    grid: this,
                    table: this.table,
                    rowHeight: this.rowHeight,
                    columns: this.normalColumns,
                    totalRowCount: this.totalRowCount,
                    data: this.data,
                    getData: this.getData,
                    availableRenderers: this.availableRenderers,
                    rowBatchSize: this.rowBatchSize,
                    columnBatchSize: this.columnBatchSize,
                    CLS_ROW        : this.CLS_ROW,
                    CLS_CELL       : this.CLS_CELL,
                    CLS_ROW_SIZE   : this.CLS_ROW_SIZE
                });


                this.headerView = new GridView({
                    grid: this,
                    table: this.header,
                    rowHeight: this.headerHeight,
                    columns: this.normalColumns,
                    totalRowCount: 1,
                    getData: function (row, col) { return this.columns[this.dataIdx2ColIdx[col]].header; },
                    availableRenderers: this.availableRenderers,
                    rowBatchSize: 1,
                    columnBatchSize: this.columnBatchSize,
                    CLS_ROW_SIZE: this.CLS_HEADER_SIZE,
                    CLS_ROW: this.CLS_HEADER_ROW,
                    CLS_CELL       : this.CLS_CELL,
                    columnProperties: headerColumnProps,
                    columnPosX: this.tableView.columnPosX,
                    dataIdx2ColIdx: this.tableView.dataIdx2ColIdx
                });

                this.tableContainer.appendChild(this.table);

                var panel = this.panel;
                panel.style.position = 'relative';
                panel.style.overflow = 'hidden';
                panel.style.border = '1px solid gray';

                panel.appendChild(this.headerContainer);
                panel.appendChild(this.tableContainer);
                if (this.lockedColumnCount > 0) {
                    panel.appendChild(this.lockedHeader);
                    panel.appendChild(this.lockedTableContainer);
                }

                var me = this;
                if (Adapter.hasTouch) {
                    setTimeout(function () {
                        me.maxScrollX = me.tableContainer.scrollWidth - me.tableContainer.clientWidth;
                        me.maxScrollY = me.tableContainer.scrollHeight - me.tableContainer.clientHeight;
                        me.initiScroll();
                    }, 0);
                } else {
                    Adapter.addListener(this.tableContainer, 'scroll', this.scrollMove, this);
                }

                // hover stuff
                if (Adapter.hasTouch) {
//            Adapter.addListener(this.table, 'touchstart', this.mouseMoveHandler, this);
//            Adapter.addListener(this.lockedTable, 'touchstart', this.mouseMoveHandler, this);
//            Adapter.addListener(this.table, 'touchend', this.mouseOutHandler, this);
//            Adapter.addListener(this.lockedTable, 'touchend', this.mouseOutHandler, this);
                } else {
                    Adapter.addListener(this.table, 'mousemove', this.mouseMoveHandler, this);
                    Adapter.addListener(this.table, 'mouseover', this.mouseOverHandler, this);
                    Adapter.addListener(this.table, 'mouseout', this.mouseOutHandler, this);
                    if (this.lockedColumnCount > 0) {
                        Adapter.addListener(this.lockedTable, 'mousemove', this.mouseMoveHandler, this);
                        Adapter.addListener(this.lockedTable, 'mouseover', this.mouseOverHandler, this);
                        Adapter.addListener(this.lockedTable, 'mouseout', this.mouseOutHandler, this);
                    }
                }
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
//                this.headerView.onHorizontalScroll(Utils.minMax(-x, 0, this.maxScrollX));
//                if (this.lockedColumnCount > 0) this.lockedTableView.onVerticalScroll(Utils.minMax(-y, 0, this.maxScrollY));
//
//                this.tableView.scrollTo(-x, -y);
                this.scrollTo(-x, -y);
            },

            positionHeader: function () {
                this.headerContainer.scrollLeft = this.tableContainer.scrollLeft;
            },

            positionLockedTable: function () {
                this.lockedTableContainer.scrollTop = this. tableContainer.scrollTop;
            },

            scrollMove: function () {
//                this.tableView.scrollTo(this.tableContainer.scrollLeft, this.tableContainer.scrollTop);
//                this.headerView.onHorizontalScroll(this.tableContainer.scrollLeft);
//                this.positionHeader();
//                if (this.lockedColumnCount > 0) {
//                    this.lockedTableView.onVerticalScroll(this.tableContainer.scrollTop);
//                    this.positionLockedTable();
//                }
                this.scrollTo(this.tableContainer.scrollLeft, this.tableContainer.scrollTop);
                this.positionHeader();
                if (this.lockedColumnCount > 0) this.positionLockedTable();
            },

            colResizeCursorHandler: function (evt) {
                Adapter.fixPageCoords(evt);
                var hView = this.headerView,
                    posx = evt.pageX - Adapter.getPageX(this.header),
                    colIdx = hView.getColumnIdx(posx),
                    curVal = '';

                posx -= hView.columnPosX[colIdx];
                if ((posx < 5 ? --colIdx >= 0 : posx > hView.columns[colIdx].actWidth - 5) &&
                    hView.columns[colIdx].resizable) curVal = 'col-resize';

                if (this.lastHeaderCursor !== curVal) {
                    this.lastHeaderCursor = curVal;
                    Adapter.updateCSSRule('.'+this.CLS_HEADER_SIZE, 'cursor',  curVal);
                }
            },

            onHeaderDragStart: function (evt) {
                var columns = this.normalColumns,
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
                    this.dragColIdx = this.moveColumn(this.dragColIdx, this.dragColOffset);
                }
            },

            onHeaderDragEnd: function (evt) {
                var colIdx = this.dragColIdx;

                if (this.dragColResize) {
                    this.headerView.removeClassFromColumn(this.CLS_HEADER_RES, colIdx);
                    this.tableView.removeClassFromColumn(this.CLS_COLUMN_RES, colIdx);
//                    if (this.iScroll) this.iScroll.refresh();
                    this.setSize(this.width+2, this.height+2);
                } else {
                    Adapter.setXCSS('.'+this.normalColumns[colIdx].layoutCls, this.tableView.columnPosX[colIdx]);
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

            moveColumn: function (colIdx, offset) {
                var firstCol = this.tableView.firstVisibleColumn,
                    ccolumns = this.columns,
                    lColCount = this.lockedColumnCount,
                    columns = this.normalColumns,
                    columnsX = this.tableView.columnPosX,
                    copyVisCol = this.copyVisibleColumn,

                    colIdxMap = this.tableView.dataIdx2ColIdx,
                    vLeft = offset,
                    i, tmpCol, tmp2Col;

                if (vLeft < columnsX[colIdx]) {
                    tmpCol = columns[colIdx];
                    tmp2Col = ccolumns[colIdx+lColCount];

                    copyVisCol.call(this, colIdx-firstCol, -1);

                    for (i = colIdx-1; i >=0 && vLeft < columnsX[i] + (columns[i].actWidth >> 1); --i) {
                        colIdxMap[(columns[i+1] = columns[i]).dataIndex] = i+1;
                        ccolumns[lColCount+i+1] = ccolumns[lColCount+i];
                        copyVisCol.call(this, i-firstCol, i+1-firstCol);
                    }
                    ++i;
                    if (i < colIdx) {
                        colIdxMap[(columns[i] = tmpCol).dataIndex] = i;
                        ccolumns[lColCount+i] = tmp2Col;
                        copyVisCol.call(this, -1, i-firstCol);

                        this.calcColumnPosX(this.normalColumns, this.tableView.columnPosX, i, colIdx);
                        this.applyColumnStyles(this.normalColumns, this.tableView.columnPosX, i, colIdx);
                        colIdx = i;
                    }

                } else {
                    var vRight = vLeft + columns[colIdx].actWidth;
                    tmpCol = columns[colIdx];
                    tmp2Col = ccolumns[colIdx+lColCount];

                    copyVisCol.call(this, colIdx-firstCol, -1);

                    var totalCount = this.normalColumns.length;
                    for (i = colIdx+1; i < totalCount && vRight > columnsX[i] + (columns[i].actWidth >> 1); ++i) {
                        colIdxMap[(columns[i-1] = columns[i]).dataIndex] = i-1;
                        ccolumns[lColCount+i-1] = ccolumns[lColCount+i];
                        copyVisCol.call(this, i-firstCol, i-1-firstCol);
                    }
                    --i;
                    if (colIdx < i) {
                        colIdxMap[(columns[i] = tmpCol).dataIndex] = i;
                        ccolumns[lColCount+i] = tmp2Col;
                        copyVisCol.call(this, -1, i-firstCol);
                        this.calcColumnPosX(this.normalColumns, this.tableView.columnPosX, colIdx, i);
                        this.applyColumnStyles(this.normalColumns, this.tableView.columnPosX, colIdx, i);
                        colIdx = i;
                    }
                }

                Adapter.setXCSS('.'+columns[colIdx].layoutCls, offset);
                return colIdx;
            },

            // both inclusive (normal: 0, total)
            calcColumnPosX: function (columns, columnsX, fromIdx, toIdx) {
                //if (toIdx === undefined) toIdx = this.totalColumnCount;

                var startX;
                if (fromIdx == 0) {
                    columnsX[0] = startX = 0;
                } else {
                    startX = columnsX[--fromIdx];
                }

                for (var i = fromIdx; i < toIdx;) {
                    startX += columns[i].visible ? columns[i].actWidth : 0;
                    ++i;
                    columnsX[i] = startX;
                }
            },

            // both inclusive (normal: 0, total-1)
            applyColumnStyles: function (columns, columnsX, from, to) {
//                from = from || 0;
//                if (to === undefined) to = this.totalColumnCount-1;

//                var colPorps = this.columnProperties;

                for (var dc = from; dc <= to; ++dc) {
                    var colConfig = columns[dc];
                    var ruleName = '.'+colConfig.layoutCls;
                    Adapter.setXCSS(ruleName, columnsX[dc]);
                    Adapter.updateCSSRule(ruleName, 'width', colConfig.actWidth + 'px');
                }
            },

            setTableSize: function () {
                this.tableView.setTableSize();
                this.headerView.setTableSize();
                if (this.lockedColumnCount > 0) {
                    this.lockedHeaderView.setTableSize();
                    this.lockedTableView.setTableSize();
                }

                if (this.iScroll) this.iScroll.refresh();
            },

            applyColumnWidths: function (width) {
                width = width || this.width;

                this.calcColumnWidths(width);

                var lockedWidth = 0;

                if (this.lockedColumnCount > 0) {
                    var lcols = this.lockedColumns;
                    if (this.columnsChanged) {
                        this.calcColumnPosX(lcols, this.lockedTableView.columnPosX, 0, lcols.length);
                        this.applyColumnStyles(lcols, this.lockedTableView.columnPosX, 0, lcols.length - 1);

                        this.lockedTableView.setTableSize();
                        this.lockedHeaderView.setTableSize();
                    }
                    lockedWidth = this.lockedHeaderView.columnPosX[lcols.length];
                }

                this.tableView.scrollXOffset = lockedWidth;

                if (this.columnsChanged) {
                    var ncols = this.normalColumns;
                    this.calcColumnPosX(ncols, this.tableView.columnPosX, 0, ncols.length);
                    this.applyColumnStyles(ncols, this.tableView.columnPosX, 0, ncols.length - 1);

                    this.tableView.setTableSize();
                    this.headerView.setTableSize();
                }

                this.lockedWidth = lockedWidth;
                this.columnsChanged = false;
            },

            setSize: function (width, height) {

                width -= 2; // border
                height -= 2; //

                var headerHeight = this.headerHeight;
                var availWidth = width;
                if (this.totalRowCount * this.rowHeight + headerHeight > height) availWidth -= 18; // TODO: scrollbar width

                this.applyColumnWidths(availWidth);

                var lockedWidth = this.lockedWidth;

                if (width < lockedWidth || height < headerHeight) return;

                this.width = width;
                this.height = height;

                this.tableWidth = width - lockedWidth;
                this.tableHeight = height - headerHeight;

                // containers
                this.panel.style.width = width + 'px';
                this.panel.style.height = height + 'px';

                var tcStyle = this.tableContainer.style;
                tcStyle.width = /*this.tableWidth*/ width + 'px';
                tcStyle.height = this.tableHeight + 'px';
//                tcStyle.left = /*lockedWidth +*/ '0px';
                tcStyle.top = headerHeight + 'px';

                var visibleWidth = this.tableContainer.clientWidth - lockedWidth;
                var visibleHeight = this.tableContainer.clientHeight;

                var hcStyle = this.headerContainer.style;
                hcStyle.width = visibleWidth + 'px';
                hcStyle.height = headerHeight + 'px';
                hcStyle.left = lockedWidth + 'px';

                if (this.lockedColumnCount > 0) {
                    this.lockedHeader.style.width = lockedWidth + 'px';
                    this.lockedHeader.style.height = headerHeight + 'px';

                    var ltcStyle = this.lockedTableContainer.style;
                    ltcStyle.width = lockedWidth + 'px';
                    ltcStyle.height = visibleHeight + 'px';
                    ltcStyle.top = headerHeight + 'px';

                    //views
                    this.lockedHeaderView.setVisibleSize(lockedWidth, headerHeight);
                    this.lockedTableView.setVisibleSize(lockedWidth, visibleHeight);
                }

                this.maxScrollX = this.tableContainer.scrollWidth - visibleWidth;
                this.maxScrollY = this.tableContainer.scrollHeight - visibleHeight;

                this.headerView.setVisibleSize(visibleWidth, headerHeight);
                this.tableView.setVisibleSize(visibleWidth, visibleHeight);

                // inner div is actually smaller, but the outer still displays a scrollbar with overflow=='auto'
                // some bug in chrome ?? (haven't tried in other browsers)
                // here's a workaround:
                tcStyle.overflow = 'hidden';
                setTimeout(function () { tcStyle.overflow = 'auto'; }, 0);

                if (this.iScroll) this.iScroll.refresh();
//                console.log('size', this.tableWidth, this.tableHeight, visibleWidth, visibleHeight);
            },

            getColumnIdx: function (dataIdx) {
                var idx;

                if (this.lockedColumnCount > 0) idx = this.lockedTableView.dataIdx2ColIdx[dataIdx];
                if (idx !== undefined) return idx;

                idx = this.tableView.dataIdx2ColIdx[dataIdx];

                return idx !== undefined ? idx + this.lockedColumnCount : -1;
            },

            setColumnVisible: function (colDataIdx, visible) {
                var idx = this.getColumnIdx(colDataIdx);

                if (idx == -1 || this.columns[idx].visible == visible) return;

                this.columns[idx].visible = visible;
                this.columnsChanged = true;
                this.setSize(this.width+2, this.height+2);

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

            updateView:function () {
                this.headerView.updateView();
                this.tableView.updateView();
                if (this.lockedColumnCount > 0) {
                    this.lockedHeaderView.updateView();
                    this.lockedTableView.updateView();
                }
            },

            scrollTo: function (x, y) {
                x = Utils.minMax(x, 0, this.maxScrollX);
                y = Utils.minMax(y, 0, this.maxScrollY);

                this.headerView.scrollTo(x, 0);
                this.tableView.scrollTo(x, y);
                if (this.lockedColumnCount > 0) {
                    this.lockedTableView.scrollTo(0, y);
                    this.lockedHeaderView.scrollTo(0, 0);
                }
            },

            setTotalRowCount: function (rowCount) {
                this.totalRowCount = rowCount;
                this.tableView.setTotalRowCount(rowCount);
                if (this.lockedColumnCount > 0) {
                    this.lockedTableView.setTotalRowCount(rowCount);
                }
                if (this.iScroll) this.iScroll.refresh();
            },

            getData: function (row, col) {
                return this.data[row][col];
            },

            setData:function (row, col, data) {
                var old = this.data[row][col];
                if (old !== data)  {
                    this.data[row][col] = data;
                    this.invalidateData(row, col);
                }
            },

            invalidateData:function (row, col) {
                if (this.lockedColumnCount > 0) this.lockedTableView.invalidateData(row, col);
                this.tableView.invalidateData(row, col);
            },

            mouseMoveHandler: function (evt) {
                Adapter.fixPageCoords(evt);

                var x = evt.pageX;
                var y = evt.pageY;

                this.tableView.mouseIsOver(x, y);
                if (this.lockedColumnCount > 0) this.lockedTableView.mouseIsOver(x, y);
            },

            mouseOverCount: 0,

            mouseOverHandler: function (evt) {
                if (++this.mouseOverCount == 1) {
                    this.mouseMoveHandler(evt);
                } else {
                    this.tableView.mouseIsOver(-1, -1);
                    if (this.lockedColumnCount > 0) this.lockedTableView.mouseIsOver(-1, -1);
                }
            },

            mouseOutHandler: function (evt) {
                if (--this.mouseOverCount == 0){
                    this.tableView.mouseIsOver(-1, -1);
                    if (this.lockedColumnCount > 0) this.lockedTableView.mouseIsOver(-1, -1);
                }
            }
        };

        return Grid;
    }
);
