ClassDefReq('v3grid.DefaultHeaderRenderer', {
    extends: 'v3grid.DefaultItemRenderer',

    updateData: function (grid, row, column) {
        this.setData(column.header);
    }
});
