define('v3grid/TextFilter',
  [],
  function () {
    var Filter = function (columnName) {
      this.columnName = columnName;
    }

    Filter.prototype = {
      filterString: '',

      filter: function (grid, getData, row) {
        var value = getData.call(grid, row, this.columnName);
        value = value ? value.toString() : '';
        return value.indexOf(this.filterString) >= 0;
      }
    }

    return Filter;
  }
);
