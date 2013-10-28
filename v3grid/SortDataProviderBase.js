ClassDefReq('v3grid.SortDataProviderBase', {
    extends: 'v3grid.Observable',
    requires:['v3grid.Adapter' ],

    ctor: function SortDataProviderBase(config) {
        config = config || {};
        v3grid.Adapter.merge(this, config);

        this.sortedBy = [];

        var dataProvider = this.dataProvider;
        if (dataProvider && dataProvider.addListener) {
            dataProvider.addListener('dataChanged', this.refresh, this);
            dataProvider.addListener('cellChanged', this.invalidateCell, this);
        }
    },

    setFields: function (fields, noUpdate) {
        var oldFields = this.sortedBy;
        this.sortedBy = fields;
        if (!noUpdate) this.fireEvent('sortChanged', fields, oldFields);
    },

    getCompareFunction: function (sortField) {
        var dp = this.dataProvider,
            fields = this.sortedBy,
            flen = (fields.length+1) >> 1,
            cache = {};

        return function (a, b) {
            if (typeof sortField == 'function') {
                a = sortField(a);
                b = sortField(b);
            } else if (typeof sortField == 'string') {
                a = a[sortField];
                b = b[sortField];
            }

            var ca = cache[a] || (cache[a] = []);
            var cb = cache[b] || (cache[b] = []);

            for (var f = 0; f < flen; ++f) {
                // fill cache if needed
                if (ca.length <= f) ca[f] = dp.getCellData(a, fields[f << 1]);
                if (cb.length <= f) cb[f] = dp.getCellData(b, fields[f << 1]);

                if (ca[f] == cb[f]) continue;
                var asc = (fields[(f << 1) | 1] == 'asc') ? -1 : 1;

                // undef is neither less nor greater than any number: undef < 5 === false; undef > 5 === false
                // if cb[f] === undef -> it's ok, because the comparison (ca[f] < undef) returns false,
                // which means undef is less than the other (non-undef) value, and this is how I want it to work
                if (ca[f] === undefined) return asc;

                return (ca[f] < cb[f]) ? asc : -asc;
            }
            // if all fields are equal, we sort based on original node index
            return a < b ? -1 : a > b ? 1 : 0;
        };
    }

});
