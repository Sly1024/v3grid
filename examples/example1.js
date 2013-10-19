require(['v3grid/Grid', 'v3grid/SortDataProvider', 'v3grid/ColumnSelector', 'v3grid/FilterDataProvider',
         'v3grid/ColumnDragger', 'v3grid/ArrayDataProvider', 'v3grid/FilterHeaderRendererInjector',
         'v3grid/SortHeaderRendererInjector'],
    function (V3Grid, SortDataProvider, ColumnSelector, FilterDataProvider,
              ColumnDragger, ArrayDataProvider, FilterHeaderRendererInjector,
              SortHeaderRendererInjector) {

        Ext.namespace('v3grid');
        v3grid.V3Grid = V3Grid;

        Ext.application({
            requires: [
                'virtualgrid.VirtualGrid',
//                'virtualgrid.ButtonItemRenderer',
                'virtualgrid.CheckBoxItemRenderer',
                'virtualgrid.LinkItemRenderer',
                'virtualgrid.NumberItemRenderer'
            ],
            launch:function () {

                var hasTouch = (Ext.global.ontouchstart !== undefined);

                function argsToString(args) {
                    var arr = [];
                    for (var len = args.length, i=0; i<len; ++i) {
                        arr.push(args[i].toString());
                    }
                    return arr.join(' ');
                }

                function log() {
                    document.getElementById('logarea').value = argsToString(arguments) + '\n';
                }

                function loga() {
                    document.getElementById('logarea').value = argsToString(arguments) + '\n' + document.getElementById('logarea').value;
                }

                if (hasTouch) {
                    console = console || {};
                    console.log = loga;
                }

                // init data
                var columnCount = 100;
                var rowCount = 100;

                var cellData = [];
                for (var r = 0; r<rowCount; ++r) {
                    cellData[r] = [];
                    for (var c = 0; c<columnCount; ++c) cellData[r][c] =
                        //c+', '+r;
                        Math.floor((Math.random() - 0.5)*10000);
                }
                var columns = [];
                for (var c=0; c<columnCount; ++c) {
                    columns[c] = {
                        dataIndex: c,
                        header: 'Column '+c,
                        width: (((c*10) % 50)+50),
                        renderer: c % 5 == 0 ? 'virtualgrid.CheckBoxItemRenderer' : c % 5 == 3 ? 'virtualgrid.LinkItemRenderer' : 'virtualgrid.NumberItemRenderer',
                        disableSort: c % 5 == 0
                    };
                }

                var arrayDataProvider = new ArrayDataProvider(cellData);
                var filterer = new FilterDataProvider({
                    dataProvider: arrayDataProvider
                });

                var sorter = new SortDataProvider({
                    dataProvider: filterer
                });

                var grid = Ext.create('virtualgrid.VirtualGrid', {
                    gridConfig: {
                        leftLockedColumnCount: 3,
                        rightLockedColumnCount: 3,
                        topLockedRowCount: 3,
                        bottomLockedRowCount: 3,
                        rowHeight: 25,
                        headerHeight: 30,
                        dataProvider: sorter,
                        columns: columns,
                        features: [
                            new FilterHeaderRendererInjector(filterer),
                            new SortHeaderRendererInjector(sorter),
                            new ColumnDragger(),
                            new ColumnSelector()
                        ]
//                        getRowStyle: function (row) {
//                            var val = 255 - (row*2.5 >> 0);
//                            return { backgroundColor: 'rgb(200,'+val+',0)'};
//                        },
//                        getCellStyle: function (row, col) {
//                            var val = (row + col.dataIndex) & 1;
//                            return { backgroundColor: 'rgba(200,'+((val*200)&255)+',0,0.5)'};
//                        }
                    }
                });

                var view = Ext.create('Ext.container.Viewport',{
                    layout: 'fit',
                    items: [
                        {
                            xtype: 'container',
                            layout: 'border',
                            items: [
                                {
                                    region: 'north',
                                    xtype: 'container',
                                    layout: {
                                        type: 'hbox',
                                        align: 'stretch'
                                    },
                                    items: [
                                        {
                                            xtype: 'button',
                                            text:'Click',
                                            handler: button_click
                                        },
                                        {
                                            xtype: 'button',
                                            text:'Unsort',
                                            handler: function () { sorter.unSort();}
                                        },
                                        {
                                            xtype: 'button',
                                            text:'Unfilter',
                                            handler: function () { filterer.filters.length = 0; filterer.refresh();}
                                        },
                                        {
                                            xtype: 'combo',
                                            itemId: 'columnSelectorCombo',
                                            store: {
                                                fields: ['dataIndex', 'header']
                                            },
                                            displayField: 'header',
                                            valueField: 'dataIndex',
                                            autoSelect: true,
                                            editable: false,
                                            queryMode: 'local'
                                        },
                                        {
                                            xtype: 'button',
                                            text: 'Add',
                                            handler: addColumn
                                        },
                                        {
                                            xtype: 'button',
                                            text: 'Remove',
                                            handler: removeColumn
                                        },
                                        {
                                            xtype:'label',
                                            text: 'x',
                                            itemId: 'textlabel'
                                        },
                                        {
                                            xtype:'textarea',
                                            id:'logarea',
                                            style: {
                                                display: hasTouch ? 'block' : 'none'
                                            }
                                        }
                                    ]
                                },
                                grid
                            ]
                        }
                    ]
                });

                grid.afterGridCreated(function () {
                    window.vgrid = grid.grid;
                    view.down('#columnSelectorCombo').getStore().loadData(grid.grid.colMgr.columns);
                });

                var textnode = Ext.ComponentQuery.query("#textlabel")[0].el.dom.firstChild;

                var running = false;
                var updater_id;
                function button_click() {
                    if (running) {
                        clearTimeout(updater_id);
                    } else {
                        updater_id = setTimeout(update, 0);
                    }
                    running = !running;
                }

                var lastUpdate = 0;
                var colNum = grid.grid.columns.length;
                var crows = colNum * grid.grid.totalRowCount;
                var updateBatch = crows / 1000;

                function update() {
                    for (var i=0; i<updateBatch; ++i)  {
                        var idx = Math.floor(Math.random() * crows);
                        var cidx = idx % colNum;
                        var ridx = idx / colNum >> 0;
                        cellData[ridx][cidx] = Math.floor((Math.random() - 0.5)*10000);
                        arrayDataProvider.invalidateCell(ridx, cidx);
                    }
                    var t = +new Date();
                    var elaps = t - lastUpdate;
                    textnode.nodeValue = elaps + ' ms - ' + Math.floor(1000*updateBatch/elaps) + ' upd/sec';
                    lastUpdate = t;
                    if (running) updater_id = setTimeout(update, 10);
                }

                function addColumn() {
                    var dataIdx = view.down('#columnSelectorCombo').getValue();
                    var col = grid.grid.addColumn(columns[dataIdx], 4);
                }

                function removeColumn() {
                    var dataIdx = view.down('#columnSelectorCombo').getValue();
                    var idxs = grid.grid.colMgr.colDataIdx2Idxs[dataIdx];

                    if (idxs && idxs.length) {
                        grid.grid.removeColumn(idxs[0]);
                    }
                }

            }
        });

    }
);
