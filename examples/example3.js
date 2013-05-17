require(['v3grid/Grid', 'v3grid/Adapter', 'v3grid/TreeSortDataProvider', 'v3grid/TreeDataProvider', 'v3grid/TreeMapper',
         'v3grid/TreeFilterDataProvider',
         'v3grid/ColumnSelector', 'v3grid/FormatterItemRenderer', 'v3grid/ColumnDragger', 'v3grid/Observable'],
    function (V3Grid, V3GridAdapter, TreeSortDataProvider, TreeDoataProvider, TreeMapper, TreeFilterDataProvider,
              ColumnSelector, FormatterRenderer, ColumnDragger, Observable) {
        Ext.namespace('v3grid');
        v3grid.V3Grid = V3Grid;

        Ext.application({
            requires:[
                'virtualgrid.VirtualGrid'
//                'virtualgrid.ButtonItemRenderer',
//                'virtualgrid.CheckBoxItemRenderer',
//                'virtualgrid.LinkItemRenderer',
//                'virtualgrid.NumberItemRenderer'
            ],
            launch: function () {

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

                if (V3GridAdapter.hasTouch) {
                    console = console || {};
                    console.log = loga;
                }

                // init data

//                var tdp = new TreeDataProvider({
//                    data: [
//                        {Region:"Southwest", categories: [
//                            {Region:"Arizona", categories: [
//                                {Territory_Rep:"Barbara Jennings", Actual:38865, Estimate:40000},
//                                {Territory_Rep:"Dana Binn", Actual:29885, Estimate:30000}]},
//                            {Region:"Central California", categories: [
//                                {Territory_Rep:"Joe Smith", Actual:29134, Estimate:30000}]},
//                            {Region:"Nevada", categories: [
//                                {Territory_Rep:"Bethany Pittman", Actual:52888, Estimate:45000}]},
//                            {Region:"Northern California", categories: [
//                                {Territory_Rep:"Lauren Ipsum", Actual:38805, Estimate:40000},
//                                {Territory_Rep:"T.R. Smith", Actual:55498, Estimate:40000}]},
//                            {Region:"Southern California", categories: [
//                                {Territory_Rep:"Alice Treu", Actual:44985, Estimate:45000},
//                                {Territory_Rep:"Jane Grove", Actual:44913, Estimate:45000}]}
//                        ]}
//                    ],
//                    childrenField: 'categories'
//                });
                function getTreeIdx(nodeId) {
                    return (nodeId == '') ? [] : nodeId.split(',');
                }

                var tdp = new Observable({

                    // TreeDataProvider API - start
                    getRootId: function () {
                        return '';
                    },

                    getChildrenInfo: function (nodeId) {
                        var treeIdx = getTreeIdx(nodeId),
                            depth = treeIdx.length + 1,
                            childrenInfo = [];

                        if (depth < 4) for (var i = 0; i < 26; ++i) {
                            childrenInfo.push({
                                id: treeIdx.concat(i).join(','),
                                depth: depth,
                                childCount: depth < 3 ? 26 : 0
                            });
                        }

                        return childrenInfo;
                    },

                    getCellData: function (nodeId, colDataIdx) {
                        var treeIdx = getTreeIdx(nodeId);
                        switch (colDataIdx) {
                            case 'label':
                                return treeIdx.map(function (letter) { return String.fromCharCode(65+Number(letter));}).join('');
                            case 'treeIdx':
                                return nodeId;
                        }
                    },

                    refresh: function () {
                        this.fireEvent('dataChanged');
                    }
                    // TreeDataProvider API - end
                });

                var filter = new TreeFilterDataProvider({ dataProvider: tdp });
                var sorter = new TreeSortDataProvider({ dataProvider: filter});
                var mapper = new TreeMapper({ dataProvider: sorter });

                var grid = Ext.create('virtualgrid.VirtualGrid', {
                    gridConfig: {
                        rowHeight: 25,
                        headerHeight: 30,
                        features: [mapper, filter, sorter, new ColumnSelector(), new ColumnDragger()],
                        lockedColumnCount: 0,
                        dataProvider: mapper,
                        columns: [
//                            { dataIndex: 'Region', minWidth: 200, width: '2*', style: { color: 'red'} },
//                            { header: 'Territory Rep', dataIndex: 'Territory_Rep', width: '2*', minWidth: 200 },
//                            { dataIndex: 'Actual', width: '1*', minWidth: 100, resizable: false, cls:'number', visible: true,
//                                renderer: FormatterRenderer, formatter: Ext.util.Format.numberRenderer("$0,0") },
//                            { dataIndex: 'Estimate', width: '1*', minWidth: 100, cls:'number',
//                                renderer: FormatterRenderer, formatter: Ext.util.Format.numberRenderer("0.0") }
                            { dataIndex: 'label', width: '1*'},
                            { dataIndex: 'treeIdx', width: '1*' }
                        ]
                    }
                });

                Ext.create('Ext.container.Viewport',{
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
                                            text:'Unsort',
                                            handler: function () { sorter.unSort();}
                                        },
//                                        {
//                                            xtype:'label',
//                                            text: 'x',
//                                            itemId: 'textlabel'
//                                        },
                                        {
                                            xtype: 'numberfield',
                                            itemId: 'expandlevel',
                                            fieldLabel: 'Expand To Level',
                                            value: 0,
                                            maxValue: 2,
                                            minValue: 0,
                                            width: 150,
                                            listeners: {
                                                change: function (numfield) {
                                                    mapper.expandToLevel(numfield.getValue());
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'label',
                                            padding: 5,
                                            text: 'Focus the grid and press Ctrl-Q for ColumnSelector'
                                        },
                                        {
                                            xtype:'textarea',
                                            id:'logarea',
                                            style: {
                                                display: V3GridAdapter.hasTouch ? 'block' : 'none'
                                            }
                                        }
                                    ]
                                },
                                grid
                            ]
                        }
                    ]
                });

//                var textnode = Ext.ComponentQuery.query("#textlabel")[0].el.dom.firstChild;

            }
        });
    }
);