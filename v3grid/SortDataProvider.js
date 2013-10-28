ClassDefReq('v3grid.SortDataProvider', {
    extends:'v3grid.SortDataProviderBase',
    requires:['v3grid.Adapter'],

    ctor: function SortDataProvider(config) {
        this.super.ctor.call(this, config);
        this.index = [];
        this.invIndex = [];
        this.unSort(true);
    },


    /* DataProvider API - start */
    getRowCount: function () {
        return this.index.length;
    },

    getRowId: function (row) {
        return this.dataProvider.getRowId(this.index[row]);
    },

    getCellData: function (row, col) {
        return this.dataProvider.getCellData(this.index[row], col);
    },

    refresh: function () {
        var oldFields = this.sortedBy;
        this.unSort(true);
        this.sort(oldFields);
    },

    invalidateCell: function (row, column) {
        var sortedColIdx = v3grid.Adapter.indexOf(this.sortedBy, column);

        // if index is even (0, 2, ... and not -1)
        // we found 'column' in 'sortedBy', so we need to re-sort.
        if ((sortedColIdx & 1) == 0) {
            this.refresh();
            return;
        }

        this.fireEvent('cellChanged', this.invIndex[row], column);
    },
    /* DataProvider API - end */

    sort: function (fields, noUpdate) {
        this.setFields(fields, noUpdate);

        var index = this.index, invIdx = this.invIndex;
        index.sort(this.getCompareFunction());

        for (var rowCount = index.length, i = 0; i < rowCount; ++i) invIdx[index[i]] = i;

        if (!noUpdate) this.fireEvent('dataChanged');
    },

    unSort: function (noUpdate) {
        this.setFields([], noUpdate);

        var rowCount = this.dataProvider.getRowCount();
        var index = this.index,
            invIdx = this.invIndex;

        index.length = invIdx.length = rowCount;

        for (var i = 0; i < rowCount; ++i) invIdx[i] = index[i] = i;

        if (!noUpdate) this.fireEvent('dataChanged');
    }
});
