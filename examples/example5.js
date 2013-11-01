require(['v3grid/Grid', 'v3grid/SortDataProvider', 'v3grid/ColumnSelector', 'v3grid/FilterDataProvider',
         'v3grid/ColumnDragger', 'v3grid/ArrayDataProvider', 'v3grid/FilterHeaderRendererInjector',
         'v3grid/SortHeaderRendererInjector', 'v3grid/GroupHeaderRenderer'],
    function (V3Grid, SortDataProvider, ColumnSelector, FilterDataProvider,
              ColumnDragger, ArrayDataProvider, FilterHeaderRendererInjector,
              SortHeaderRendererInjector, GroupHeaderRenderer) {

        Ext.namespace('v3grid');
        v3grid.V3Grid = V3Grid;

        Ext.application({
            requires: [
                'virtualgrid.VirtualGrid',
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

                var topColumns = [];
                for (var tc = 0; tc < columnCount/5; ++tc) {
                    topColumns[tc] = {
                        dataIndex: tc,
                        header: 'TopColumn '+tc,
                        children: columns.slice(tc*5,tc*5+5)
                    };
                }

                topColumns.splice(0, 2, {
                    dataIndex: 'toptop',
                    children: topColumns.slice(0, 2)
                });

                var arrayDataProvider = new ArrayDataProvider(cellData);
                arrayDataProvider.getCellSpan = function (row, col) {
                    return [ col % 5 == 1 ? (row & 1) * 3 - 1 : 1,
                             row % 5 == 0 ? (col % 5 == 2 ? 2 : (col % 5 == 3 ? -1 : 1)) : 1 ]
                };


                var filterer = new FilterDataProvider({
                    dataProvider: arrayDataProvider
                });
//
                var sorter = new SortDataProvider({
                    dataProvider: filterer
                });

                var grid = Ext.create('virtualgrid.VirtualGrid', {
                    gridConfig: {
                        dataProvider: sorter, //arrayDataProvider,
                        columns: topColumns,
                        features: [
                            new FilterHeaderRendererInjector(filterer),
                            new SortHeaderRendererInjector(sorter),
                            new ColumnDragger()
                        ]
                    },
                    listeners: {
                        gridCreated: function (grid) {
                            window.vgrid = grid.grid;
                        }
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



            }
        });

    }
);
