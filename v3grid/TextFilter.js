ClassDefReq('v3grid.TextFilter', {
    filterString: '',

    ctor: function TextFilter(columnName) {
        this.columnName = columnName;
    },

    filter: function (dataProvider, row) {
        var value = dataProvider.getCellData(row, this.columnName);
        if (typeof value !== 'string') value = value ? value.toString() : '';
        return value.indexOf(this.filterString) >= 0;
    }
});
