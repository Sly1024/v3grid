ClassDefReq('v3grid.FormatterItemRenderer', {
    extends: 'v3grid.DefaultItemRenderer',

    updateData: function (grid, row, col) {
        var data = grid.dataProvider.getCellData(row, col.dataIndex);
        this.view.nodeValue = data != null ? col.formatter(data) : '';
    }
});
