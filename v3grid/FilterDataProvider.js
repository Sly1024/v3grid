ClassDefReq('v3grid.FilterDataProvider', {
    extends: 'v3grid.FilterDataProviderBase',

    ctor: function FilterDataProvider(config) {
        this.super.ctor.call(this, config);
        this.index = [];
        this.invIndex = [];
        this.update();
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

    invalidateCell: function (row, column) {
        if (!this.rowUpdated(row)) {
            this.fireEvent('cellChanged', this.invIndex[row], column);
        }
    },
    /* DataProvider API - end */

    rowUpdated: function (row) {
        var index = this.index;
        var invIdx = this.invIndex,
            iRow = invIdx[row];
        var pass = this.applyFiltersToRow(row),
            updateInvStartIdx = -1;

        if (iRow == -1 && pass) { // need to insert
            // search for its place
            // TODO: binary search
            for (var i = 0; i < index.length; ++i) {
                if (index[i] > row) break;
            }
            index.splice(i, 0, row);
            updateInvStartIdx = i;
        } else if (iRow != -1 && !pass) { // need to remove
            index.splice(iRow, 1);
            invIdx[row] = -1;
            updateInvStartIdx = iRow;
        }

        if (updateInvStartIdx >= 0) {
            for (i = updateInvStartIdx;i < index.length; ++i) invIdx[index[i]] = i;
            this.fireEvent('dataChanged');
            return true;
        }

        return false;
    },

    applyFiltersToRow: function (rowIdx) {
        var dataProvider = this.dataProvider,
            filters = this.filters;

        for (var len = filters.length, f = 0; f < len; ++f) {
            if (!filters[f].filter(dataProvider, rowIdx)) {
                return false;
            }
        }

        return true;
    },

    update: function () {
        var rowCount = this.dataProvider.getRowCount(),
            index = this.index,
            invIdx = this.invIndex,
            idxlen = 0;

        invIdx.length = rowCount;

        for (var i = 0; i < rowCount; ++i) {
            if (this.applyFiltersToRow(i)) {
                invIdx[index[idxlen] = i] = idxlen;
                idxlen++
            } else {
                invIdx[i] = -1;
            }
        }

        index.length = idxlen;
    }

});
