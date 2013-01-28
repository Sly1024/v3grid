define('v3grid/ColumnFilter',
  [],
  function () {
    var Filter = function (columnName) {
      this.columnName = columnName;
    }

    Filter.prototype = {
      filter: function (grid, getData, row) {
        return this.filterData(getData.call(grid, row, this.columnName));
      }
    }

    return Filter;
  }
);
