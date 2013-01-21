require(['v3grid/Grid', 'v3grid/SortDataProvider'],
    function (V3Grid, SortDataProvider) {
        Ext.namespace('v3grid');
        v3grid.V3Grid = V3Grid;

        Ext.application({
            requires:[
                'virtualgrid.VirtualGrid',
                'virtualgrid.ButtonItemRenderer',
                'virtualgrid.CheckBoxItemRenderer',
//    'virtualgrid.TextItemRenderer',
                'virtualgrid.LinkItemRenderer',
                'virtualgrid.NumberItemRenderer'
            ],
            launch: function (){

                // init data
                var columnCount = 1000;
                var rowCount = 100000;

                var columns = [];
                for (var c=0; c<columnCount; ++c) {
                    columns[c] = {
                        header: 'Column '+c,
                        width: (((c*10) % 50)+50),
                        renderer: c % 5 == 0 ? 'virtualgrid.LinkItemRenderer' : c % 5 == 3 ? 'virtualgrid.ButtonItemRenderer' : null
//            headerRenderer: 'virtualgrid.TextItemRenderer',
//            style: { textAlign: 'right', color:'red' },
//            headerStyle: { color: 'inherit', textAlign: 'inherit'}
                    };
                }

                var grid = Ext.create('virtualgrid.VirtualGrid', {
                    gridConfig: {
                        headerHeight: 30,
                        columnBatchSize: 5,
                        rowBatchSize: 4,
                        verticalSeparatorThickness: 0,
                        lockedColumnCount: 0,
                        columns: columns,
                        getData: function (row, col) { return col+', '+row; },
                        totalRowCount: rowCount,
                        features: [new SortDataProvider()]
//        itemRenderer: 'virtualgrid.TextItemRenderer'
                    }
                });

                Ext.create('Ext.container.Viewport',{
                    renderTo: 'maindiv',
                    layout: 'fit',
                    items: [grid]
                });
            }
        });

    }
);