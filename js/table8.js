require(['v3grid/Grid', 'v3grid/Adapter', 'v3grid/SortDataProvider', 'v3grid/TreeDataProvider', 'v3grid/ColumnSelector', 'v3grid/FormatterItemRenderer'],
    function (V3Grid, V3GridAdapter, SortDataProvider, TreeDataProvider, ColumnSelector, FormatterRenderer) {
        this.V3Grid = V3Grid;

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
                        lockedColumnCount: 1,
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
//                        columns: [
//                            { dataIndex: 'Course' },
//                            { dataIndex: 'CourseName' },
//                            { dataIndex: 'Branch' },
//                            { dataIndex: 'Girls' },
//                            { dataIndex: 'Boys' },
//                            { dataIndex: 'TotalStudent' },
//                            { dataIndex: 'PASSinper' },
//                            { dataIndex: 'FAILinper' }
//                        ],
//                        data: [
//                            {Course:"Course", children: [
//                                {CourseName:"B.Sc.", children:[
//                                    {Branch:"Physics", Girls:60, Boys:120, TotalStudent:180, PASSinper:98.0, FAILinper:2.0},
//                                    {Branch:"Chemistry", Girls:100, Boys:50, TotalStudent:150, PASSinper:97.0, FAILinper:3.0},
//                                    {Branch:"Mathematics", Girls:50, Boys:150, TotalStudent:200, PASSinper:98.5, FAILinper:1.5}]},
//                                {CourseName:"B.tech.", children:[
//                                    {Branch:"CS", Girls: 45, Boys:75, TotalStudent:120, PASSinper:99.0, FAILinper:1.0},
//                                    {Branch:"IT", Girls: 55, Boys:65, TotalStudent:120, PASSinper:99.5, FAILinper:0.5},
//                                    {Branch:"EC", Girls: 25, Boys:95, TotalStudent:120, PASSinper:96.7, FAILinper:3.3},
//                                    {Branch:"EI", Girls: 40, Boys:80, TotalStudent:120, PASSinper:95, FAILinper:5},
//                                    {Branch:"Mechanical", Girls:10, Boys: 80, TotalStudent:90, PASSinper:97.5, FAILinper:2.5},
//                                    {Branch:"Civil", Girls: 15, Boys:45, TotalStudent:60, PASSinper:92, FAILinper:8}]},
//                                {CourseName:"B.Pharma.", children:[
//                                    {Branch:"Pharmacy", Girls:70, Boys:130, TotalStudent:200, PASSinper:99.8, FAILinper:0.2}]},
//                                {CourseName:"M.B.A.", children:[
//                                    {Branch:'HR', Girls:48, Boys:72, TotalStudent:120, PASSinper:100, FAILinper:0},
//                                    {Branch:'Finance', Girls:40, Boys:80, TotalStudent:120, PASSinper:85, FAILinper:15},
//                                    {Branch:'Marketing', Girls:20, Boys:100, TotalStudent:120, PASSinper:99, FAILinper:1},
//                                    {Branch:'IT & HR', Girls:30, Boys:90, TotalStudent:120, PASSinper:100, FAILinper:0}]},
//                                {CourseName:"M.C.A.", children:[
//                                    {Branch:"Computer Science", Girls:30, Boys:90, TotalStudent: 120, PASSinper:99.1,
//                                        FAILinper:0.9}]}
//                            ]}
//                        ]
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