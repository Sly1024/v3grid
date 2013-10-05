require(['v3grid/Grid', 'v3grid/SortDataProvider', 'v3grid/FilterDataProvider', 'v3grid/DataProvider',
         'v3grid/FilterHeaderRendererInjector', 'v3grid/SortHeaderRendererInjector'],
    function (V3Grid, SortDataProvider, FilterDataProvider, DataProvider,
              FilterHeaderRendererInjector, SortHeaderRendererInjector) {
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
                var dp = new DataProvider({
                    getRowCount: function () { return rowCount; },
                    getCellData: function (row, col) { return col+', '+row; }
                });

                var filterer = new FilterDataProvider({dataProvider:dp});
                var sorter = new SortDataProvider({dataProvider:filterer});

                var grid = Ext.create('virtualgrid.VirtualGrid', {
                    gridConfig: {
                        headerHeight: 30,
                        verticalSeparatorThickness: 0,
                        columns: columns,
                        features: [new FilterHeaderRendererInjector(filterer),
                                   new SortHeaderRendererInjector(sorter)],
                        dataProvider: sorter
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