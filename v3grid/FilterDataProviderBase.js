ClassDef('v3grid.FilterDataProviderBase', {
        extends: 'v3grid/Observable',

        ctor: function FilterDataProviderBase(config) {
            config = config || {};
            this.filters = [];
            v3grid.Adapter.merge(this, config);

            var dataProvider = this.dataProvider;
            if (dataProvider && dataProvider.addListener) {
                dataProvider.addListener('dataChanged', this.refresh, this);
                dataProvider.addListener('cellChanged', this.invalidateCell, this);
            }
        },


        refresh: function () {
            this.update();
            this.fireEvent('dataChanged');
        },

        addFilter: function (filter) {
            var filters = this.filters;
            var len = filters.length;

            for (var f = 0; f < len; ++f) {
                if (filters[f] === filter) return;
            }
            filters[len] = filter;
        },

        removeFilter: function (filter) {
            var filters = this.filters;
            var len = filters.length;

            for (var f = 0; f < len; ++f) {
                if (filters[f] === filter) {
                    filters.splice(f, 1);
                    return;
                }
            }
        }

    }
);
