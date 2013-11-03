ClassDef('v3grid.Grid',
    ['v3grid.Adapter', 'v3grid.Utils', 'v3grid.ColumnManager', 'v3grid.Scrollbar'],
    function (Adapter, Utils, ColumnManager, Scrollbar) {

        return {
            extends: 'v3grid.Observable',

            requires: [
                'v3grid.DataProvider', 'v3grid.RangeDataProvider',
                'v3grid.DefaultItemRenderer', 'v3grid.DefaultHeaderRenderer',
                'v3grid.GridView', 'v3grid.RendererCache'
            ],

            // static instance counter:
            statics: {
                instanceCnt: 0
            },

            rowHeight: 22,
            headerHeight: 22,
            defaultColumnWidth: 100,
            defaultColumnMinWidth: 20,

            itemRenderer: 'v3grid.DefaultItemRenderer',
            headerRenderer: 'v3grid.DefaultHeaderRenderer',

            columnBatchSize: 1,
            rowBatchSize: 2,

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
            CLS_SCROLLBAR  : 'v3grid-scrollbar',

            ctor: function Grid(config) {
                this.initProperties(config);
                this.validateConfig(config);
                this.initFeatures(config);

                Adapter.merge(this, config);

                this.createStyles();
                this.createColumnManager();
                this.createComponents();

                this.updateHeaders();
                if (this.viewsV == 2) this.allViews('dataChanged', [], 1, 1);
                this.dataChanged();
                this.fireEvent('initialized', this);
            },

            initProperties: function (config) {
                var num = this.instanceNum = ++this.ctor.instanceCnt;

                // generated CSS classes
                this.CLS_CELL        = 'v3grid-' + num + '-cell';
                this.CLS_ROW_SIZE    = 'v3grid-' + num + '-row-size';
                this.CLS_HEADER_SIZE = 'v3grid-' + num + '-header-size';

                var container = config.renderTo;
                if (Adapter.isString(container)) {
                    container = document.getElementById(container) || document.querySelector && document.querySelector(container);
                }

                if (!container || container.nodeType !== 1) {
                    Adapter.error('[v3grid] Invalid container element: ' + config.renderTo);
                }

                this.panel = container;
                container.tabIndex = 0;

                this.width = config.width || container.clientWidth;
                this.height = config.height || container.clientHeight;
            },

            validateConfig: function (config) {
                config.columns = config.columns || [];
                if (!config.dataProvider) {
                    Adapter.error('[v3grid] Invalid dataProvider: ' + config.dataProvider);
                }
            },

            initFeatures: function (config) {
                var features = config.features;
                if (!Adapter.isArray(features)) return;

                var len = features.length;
                for (var i = 0; i < len; ++i) if (Adapter.isFunction(features[i].init)) {
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
                    })
                ];

                this.styleSheet = Adapter.createStyleSheet(rules.join(''), 'v3grid-' + num + '-style');
                this.headerCSSRule = Adapter.getCSSRule(this.styleSheet, '.' + this.CLS_HEADER_SIZE);
            },

            destroy: function () {
                Adapter.removeStyleSheet('v3grid-' + this.instanceNum + '-style');
            },

            addColumn: function (config, idx) {
                if (idx === undefined) idx = this.colMgr.columns.length;
                var col = this.colMgr.addColumn(idx, config);
                this.setSize();
                return col;
            },

            removeColumn: function (idx) {
                this.colMgr.removeColumn(idx);
                this.setSize();
            },


            moveColumn: function (fromIdx, toIdx) {
                this.colMgr.moveColumn(fromIdx, toIdx);
                this.setSize();
            },

            registerColumnConfigPreprocessor: function (processorFn, idx) {
                var ccps = this.colConfPreprocs || (this.colConfPreprocs = []);
                if (idx === undefined) idx = ccps.length;
                ccps.splice(idx, 0, processorFn);
            },

            applyColumnConfigPreprocessors: function (column) {
                var ccps = this.colConfPreprocs || [];
                for (var len = ccps.length, i = 0; i < len; ++i) {
                    column = ccps[i](column);
                }
                return column;
            },

            fixColumnConfig: function (col) {
                // util function
                function def(val, defVal) {
                    return val == null ? defVal : val;
                }

                // clone column config obj
                // TODO: think about creating a column class
                col = Adapter.merge({}, col);
                col.dataIndex = '' + col.dataIndex;
                col.header = def(col.header, col.dataIndex);

                // renderer
                var rend = def(col.renderer, this.itemRenderer);
                col.renderer = Adapter.getClass(rend);
                if (!col.renderer) Adapter.error("Could not load renderer '"+rend+"' for column '"+col.dataIndex+"'");

                // header renderer
                rend = def(col.headerRenderer, this.headerRenderer);
                col.headerRenderer = Adapter.getClass(rend);
                if (!col.headerRenderer) Adapter.error("Could not load header renderer '"+rend+"' for column '"+col.dataIndex+"'");

                col.width = def(col.width, this.defaultColumnWidth);
                col.minWidth = def(col.minWidth, this.defaultColumnMinWidth);

                col.resizable = def(col.resizable, true);
                col.visible = def(col.visible, true);

                // Note: this must be before applyColumnConfigPreprocessors,
                // so the preprocessors can access the column ID
                col.id = this.getUniqColId(col.id);

                col = this.applyColumnConfigPreprocessors(col);

                return col;
            },

            getUniqColId: function (id) {
                var uniqIds = this.columnUniqIds || this.colMgr.colId2Idx;

                while (id == null || uniqIds[id] !== undefined) {
                    id = Adapter.generateUID();
                }
                if (this.columnUniqIds) this.columnUniqIds[id] = true;
                return id;
            },

            createColumnManager: function () {
                var columns = this.columns;   // clone the array?

                this.rendererCache = new v3grid.RendererCache(this.fixRenderer);

                // this is only temporary, until we create the column manager
                this.columnUniqIds = {};

                var me = this,
                    colMgr = this.colMgr = new ColumnManager(this, columns),
                    hColMgr = colMgr;

                this.columns = colMgr.columns;
                if (colMgr.maxDepth) {
                    hColMgr = new ColumnManager(this, columns, true);
                    colMgr.addListener('columnPositionsChanged', hColMgr.calcColumnWidths, hColMgr);
                }
                this.headerColMgr = hColMgr;

//                this.headerColMgr.addListener('columnResizeEnd', function () { debugger; me.setSize(); });

                this.headerHeight = (this.origHeaderHeight = this.headerHeight) * (colMgr.maxDepth + 1);
                this.headerCSSRule.style.height = this.headerHeight + 'px';

                delete this.columnUniqIds;
            },


            fixRenderer: function (renderer) {
                if (!renderer.prototype.updateData) {
                    renderer.prototype.updateData = function (grid, row, column) { this.setData(grid.dataProvider.getCellData(row, column.dataIndex)); };
                }
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

                var colMgr = this.colMgr, hColMgr = this.headerColMgr;
                var ranges = [colMgr], hRanges = [hColMgr];
                if (viewsH > 1) {
                    // TODO: fix this: only header (top) columns can be locked
                    var colCounts = [colMgr.columns.length];
                    if (rightLCC) { colCounts[0] -= rightLCC; colCounts.push(rightLCC); }
                    if (leftLCC) { colCounts[0] -= leftLCC; colCounts.unshift(leftLCC); }
                    ranges = colMgr.getRanges(colCounts);
                    hRanges = (colMgr === hColMgr ? ranges : hColMgr.getRanges(colCounts));
                }

                var headerContainer = this.headerContainer = document.createElement('div');
                headerContainer.style.position = 'absolute';
                headerContainer.style.overflow = 'hidden';

                var viewContainer = this.viewContainer = document.createElement('div');
                viewContainer.style.position = 'absolute';
                viewContainer.style.overflow = 'hidden';

                var dp = this.dataProvider;

                // 0th is the header dataProvider
                var viewDPs = this.viewDataProviders = [this.createHeaderDataProvider()];

                if (viewsV == 2) {
                    viewDPs[1] = dp;
                } else {
                    for (var dpy = 1; dpy < viewsV; ++dpy) {
                        viewDPs[dpy] = new v3grid.RangeDataProvider({dataProvider: dp});
                    }
                }

                for (var y = 0; y < viewsV; ++y) {
                    views[y] = new Array(viewsH);

                    for (var x = 0; x < viewsH; ++x) {
                        // create div for the view
                        var table = document.createElement('div');
                        table.style.position = 'absolute';
                        table.style.overflow = 'hidden';

                        var container = document.createElement('div');
                        container.style.position = 'absolute';
                        container.style.overflow = 'hidden';
                        container.appendChild(table);

                        // add user customizable class and position marker classes:
                        // horizontally: left, center, right
                        // vertically: header, top, middle, bottom

                        var viewClass = (x < scrollViewX ? 'left' : x == scrollViewX ? 'center' : 'right') + ' ' +
                            (y == 0 ? 'header' : y < scrollViewY ? 'top' : y == scrollViewY ? 'middle' : 'bottom');

                        Adapter.addClass(container, this.CLS_TABLE + ' ' + viewClass);

                        if (y == 0) {
                            // header view
                            views[0][x] = new v3grid.GridView({
                                name: viewClass,    // for debugging
                                isHeader: true,
                                isLocked: x != scrollViewX,
                                grid: this,
                                table: table,
                                container: container,
                                rowHeight: this.headerHeight,
                                colMgr: hRanges[x],
                                leafColMgr: ranges[x],
                                dataProvider: viewDPs[0],
                                rowBatchSize: 1,
                                columnBatchSize: 1,
                                CLS_CELL       : this.CLS_CELL + ' v3grid-header-cell',
                                CLS_ROW        : this.CLS_HEADER_ROW + ' ' + this.CLS_HEADER_SIZE, // + (x == scrollViewX ? '' : ' locked'),
                                CLS_COLUMN_MOVE: this.CLS_HEADER_MOVE,
                                CLS_COLUMN_RES : this.CLS_HEADER_RES,
                                columnProperties: headerColumnProps
                            });
                            headerContainer.appendChild(container);
                        } else {
                            views[y][x] = new v3grid.GridView({
                                name: viewClass,    // for debugging
                                grid: this,
                                table: table,
                                container: container,
                                rowHeight: this.rowHeight,
                                colMgr: ranges[x],
                                dataProvider: viewDPs[y],
                                cellClicked: this.cellClicked,
                                getRowStyle: this.getRowStyle,
                                getCellStyle: this.getCellStyle,
                                rowBatchSize: this.rowBatchSize,
                                columnBatchSize: this.columnBatchSize,
                                CLS_ROW        : this.CLS_ROW + ' ' + this.CLS_ROW_SIZE,
                                CLS_CELL       : this.CLS_CELL,
                                CLS_COLUMN_MOVE: this.CLS_COLUMN_MOVE,
                                CLS_COLUMN_RES : this.CLS_COLUMN_RES
                            });
                            viewContainer.appendChild(container);
                        }

                    }
                }

                panel.appendChild(headerContainer);
                panel.appendChild(viewContainer);

                this.scrollPosX = this.scrollPosY = 0;

                if (Adapter.hasTouch) {
                    this.initiScroll();
                } else {
                    var hScrollbar = (this.hScrollbar = new Scrollbar(panel, 'horizontal')).dom;
                    var vScrollbar = (this.vScrollbar = new Scrollbar(panel, 'vertical')).dom;

                    Adapter.addClass(hScrollbar, this.CLS_SCROLLBAR + ' horizontal');
                    Adapter.addClass(vScrollbar, this.CLS_SCROLLBAR + ' vertical');

                    Adapter.addListener(hScrollbar, 'scroll', function () {
                        this.hScrollTo(hScrollbar.scrollLeft);
                    }, this);

                    Adapter.addListener(vScrollbar, 'scroll', function () {
                        this.vScrollTo(vScrollbar.scrollTop);
                    }, this);

                    if (Adapter.isFireFox) {
                        Adapter.addListener(viewContainer, 'DOMMouseScroll', this.ffMouseWheelHandler, this);
                    } else if (Adapter.isIE) {
                        Adapter.addListener(viewContainer, 'mousewheel', this.ieMouseWheelHandler, this);
                    } else {
                        Adapter.addListener(viewContainer, 'mousewheel', this.mouseWheelHandler, this);
                    }

                    // hover stuff
                    Adapter.addListener(viewContainer, 'mousemove', this.mouseMoveHandler, this);
                    Adapter.addListener(viewContainer, 'mouseover', this.mouseMoveHandler, this);
                    Adapter.addListener(viewContainer, 'mouseout', this.mouseOutHandler, this);
                }

                if (dp.addListener) {
                    dp.addListener('dataChanged', this.dataChanged, this);
                }
            },

            createHeaderDataProvider: function () {
                return new v3grid.DataProvider({
                    getRowCount: function () { return 1; }
                });
            },

            ffMouseWheelHandler: function (evt) {
                var delta = 40*evt.detail;
                if (evt.axis == 2) {
                    this.vScrollTo(this.scrollPosY + delta);
                } else {
                    this.hScrollTo(this.scrollPosX + delta);
                }
            },
            ieMouseWheelHandler: function (evt) {
                this.vScrollTo(this.scrollPosY - evt.wheelDelta);
            },
            mouseWheelHandler: function (evt) {
                if (evt.wheelDeltaX) {
                    this.hScrollTo(this.scrollPosX - evt.wheelDeltaX);
                }
                if (evt.wheelDeltaY) {
                    this.vScrollTo(this.scrollPosY - evt.wheelDeltaY);
                }
            },

            initiScroll: function () {
                var me = this;

                var eventEl = [], hLinked = [], vLinked = [],
                    views = this.views,
                    scrollViewX = this.scrollViewX,
                    scrollViewY = this.scrollViewY,
                    yTo = this.viewsV-1,
                    xTo = this.viewsH-1;

                for (var y = 0; y <= yTo; ++y) {
                    var viewsY = views[y];
                    for (var x = 0; x <= xTo; ++x) {
                        if (x == scrollViewX && y != scrollViewY) {
                            hLinked.push(viewsY[x].table);
                        }
                        if (x != scrollViewX && y == scrollViewY) {
                            vLinked.push(viewsY[x].table);
                        }
                        // everything except headers
                        if (y) {
                            eventEl.push(viewsY[x].container); // table??
                        }
                    }
                }

                this.iScroll = new iScroll(this.views[scrollViewY][scrollViewX].container, {
                    eventElements: eventEl,
                    onMoved: function (x, y) {
                        me.scrollTo(-x, -y);
                    },
                    onBeforeScrollStart: null,
                    onBeforeScrollMove: function (e) { e.preventDefault(); },
                    useTransition:false,
                    bounce: true,
                    hLinked: hLinked,
                    vLinked: vLinked
                });

            },

            setRowCounts: function () {
                var avail = this.totalRowCount,
                    topLRC = this.topLockedRowCount,
                    bottLRC = this.bottomLockedRowCount,
                    rowCounts = [];

                if (topLRC) {
                    topLRC = Math.min(topLRC, avail);
                    rowCounts.push(topLRC);
                    avail -= topLRC;
                }

                if (bottLRC) {
                    bottLRC = Math.min(bottLRC, avail);
                    rowCounts.push(bottLRC);
                    avail -= bottLRC;
                }

                rowCounts.splice(topLRC ? 1 : 0, 0, avail);

                var offs = 0;
                var dps = this.viewDataProviders;

                for (var y = 1; y < this.viewsV; ++y) {
                    var dp = dps[y];
                    dp.offset = offs;
                    offs += (dp.count = rowCounts[y-1]);
                    dp.refresh();
                }
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
                if (availHeight < 0) { headerHeight = Math.max(0, headerHeight + availHeight); availHeight = 0; }
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
                    if (y) yPos += heights[y];  // don't add header, b/c the rest is in a separate container
                }

                if (!Adapter.hasTouch) {
                    yPos += headerHeight;   // and _now_ we add header b/c the scrollbars are in the outer container
                    // note: xPos, yPos contains the correct scrollbar positions
                    this.hScrollbar.setProperties(0, yPos, isHscroll ? scrollbarWidth : 0, totalWidth);
                    this.vScrollbar.setProperties(xPos, headerHeight, isVscroll ? scrollbarHeight : 0, totalHeight);
                }

                this.maxScrollX = Math.max(0, totalWidth - scrollbarWidth);
                this.maxScrollY = Math.max(0, totalHeight - scrollbarHeight);

                this.headerContainer.style.width = scrollbarWidth + 'px';
                this.headerContainer.style.height = headerHeight + 'px';

                this.viewContainer.style.top = headerHeight + 'px';
                this.viewContainer.style.width = scrollbarWidth + 'px';
                this.viewContainer.style.height = (scrollbarHeight + headerHeight) + 'px';
//                console.log('setsize scrollMax', this.maxScrollX, this.maxScrollY);

                if (this.iScroll) this.iScroll.refresh();
//                console.log('size', this.tableWidth, this.tableHeight, visibleWidth, visibleHeight);
            },

            setColumnVisible: function (colId, visible) {
                var idx = this.colMgr.colId2Idx[colId];

                if (idx === undefined || this.colMgr.columns[idx].visible == visible) return;

                this.colMgr.columns[idx].visible = visible;
                this.setSize();
                this.colMgr.fireUpdateColumn(idx);
            },

            updateHeaders: function () {
                this.viewDataProviders[0].refresh();
            },

            updateView: function () {
                this.allViews('updateView');
            },

            hScrollTo: function (x) {
                if (x === undefined) x = this.scrollPosX;
                x = Utils.minMax(x, 0, this.maxScrollX);
                this.scrollPosX = x;

                // set scrollbar positions
                if (!Adapter.hasTouch) this.hScrollbar.dom.scrollLeft = x;

                var scrollViewX = this.scrollViewX,
                    views = this.views;

                for (var yLen = views.length, vy = 0; vy < yLen; ++vy) {
                    views[vy][scrollViewX].setXPos(x);
                    views[vy][scrollViewX].hScrollTo(x);
                }
            },

            vScrollTo: function (y) {
                if (y === undefined) y = this.scrollPosY;
                y = Utils.minMax(y, 0, this.maxScrollY);
                this.scrollPosY = y;

                // set scrollbar positions
                if (!Adapter.hasTouch) this.vScrollbar.dom.scrollTop = y;

                var viewsY = this.views[this.scrollViewY];
                for (var xLen = viewsY.length, vx = 0; vx < xLen; ++vx) {
                    viewsY[vx].setYPos(y);
                    viewsY[vx].vScrollTo(y);
                }
            },

            // calls 'scrollTo' but does not position views
            scrollTo: function (x, y) {
                if (x === undefined) x = this.scrollPosX;
                if (y === undefined) y = this.scrollPosY;

                x = Utils.minMax(x, 0, this.maxScrollX);
                y = Utils.minMax(y, 0, this.maxScrollY);

                this.scrollPosX = x;
                this.scrollPosY = y;

                // set scrollbar positions
                if (!Adapter.hasTouch) {
                    this.hScrollbar.dom.scrollLeft = x;
                    this.vScrollbar.dom.scrollTop = y;
                }

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

            dataChanged: function () {
                this.totalRowCount = this.dataProvider.getRowCount();

                if (this.viewsV > 2) {
                    this.setRowCounts();
                }

                // TODO: figure out what is needed here from setSize (not all I think)
                this.setSize();
                this.scrollTo();    // needed because filtering...
//                if (this.iScroll) this.iScroll.refresh();
            },


            mouseMoveHandler: function (evt) {
                Adapter.fixPageCoords(evt);
                this.allViews('mouseIsOver', [evt.pageX, evt.pageY], 1);
            },

            mouseOutHandler: function () {
                this.allViews('mouseIsOver', [-1, -1], 1);
            }
        };
    }
);
