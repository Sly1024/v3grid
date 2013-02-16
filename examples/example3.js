require(['v3grid/Grid', 'v3grid/Adapter', 'v3grid/SortDataProvider', 'v3grid/TreeDataProvider', 'v3grid/ColumnSelector', 'v3grid/FormatterItemRenderer'],
    function (V3Grid, V3GridAdapter, SortDataProvider, TreeDataProvider, ColumnSelector, FormatterRenderer) {
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

                var sorter = new SortDataProvider();
                var flatter = new TreeDataProvider({
                    childrenField: 'categories'
                });

                var grid = Ext.create('virtualgrid.VirtualGrid', {
                    gridConfig: {
                        rowHeight: 25,
                        headerHeight: 30,
                        columnBatchSize: 1,
                        rowBatchSize: 2,
                        features: [flatter, sorter, new ColumnSelector()],
                        lockedColumnCount: 0,
                        columns: [
                            { dataIndex: 'Region', minWidth: 200, width: '2*', style: { color: 'red'} },
                            { header: 'Territory Rep', dataIndex: 'Territory_Rep', width: '2*', minWidth: 200 },
                            { dataIndex: 'Actual', width: '1*', minWidth: 100, resizable: false, cls:'number', visible: true,
                                renderer: FormatterRenderer, formatter: Ext.util.Format.numberRenderer("$0,0") },
                            { dataIndex: 'Estimate', width: '1*', minWidth: 100, cls:'number',
                                renderer: FormatterRenderer, formatter: Ext.util.Format.numberRenderer("0.0") }
                        ],
                        data: [
                            {Region:"Southwest", categories: [
                                {Region:"Arizona", categories: [
                                    {Territory_Rep:"Barbara Jennings", Actual:38865, Estimate:40000},
                                    {Territory_Rep:"Dana Binn", Actual:29885, Estimate:30000}]},
                                {Region:"Central California", categories: [
                                    {Territory_Rep:"Joe Smith", Actual:29134, Estimate:30000}]},
                                {Region:"Nevada", categories: [
                                    {Territory_Rep:"Bethany Pittman", Actual:52888, Estimate:45000}]},
                                {Region:"Northern California", categories: [
                                    {Territory_Rep:"Lauren Ipsum", Actual:38805, Estimate:40000},
                                    {Territory_Rep:"T.R. Smith", Actual:55498, Estimate:40000}]},
                                {Region:"Southern California", categories: [
                                    {Territory_Rep:"Alice Treu", Actual:44985, Estimate:45000},
                                    {Territory_Rep:"Jane Grove", Actual:44913, Estimate:45000}]}
                            ]}
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
                                                    flatter.expandToLevel(numfield.getValue());
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