define('v3grid/TextFilter',
  [],
  function () {
    var TextFilter = function (columnName) {
      this.columnName = columnName;
    }

    TextFilter.prototype = {
      filterString: '',

      filter: function (grid, dataProvider, row) {
        var value = dataProvider.getCellData(row, this.columnName);
        if (typeof value !== 'string') value = value ? value.toString() : '';
        return value.indexOf(this.filterString) >= 0;
      }
    }

    return TextFilter;
  }
);
