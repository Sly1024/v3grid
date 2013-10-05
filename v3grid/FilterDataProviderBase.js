define('v3grid/FilterDataProviderBase',
    ['v3grid/Adapter', 'v3grid/Observable'],
    function (Adapter, Observable) {

        var FilterDataProviderBase = function (config) {
            config = config || {};
            this.filters = [];
            Adapter.merge(this, config);

            if (this.dataProvider && this.dataProvider.addListener) {
                this.dataProvider.addListener('dataChanged', this.refresh, this);
                this.dataProvider.addListener('cellChanged', this.invalidateCell, this);
            }
        };

        FilterDataProviderBase.prototype = new Observable({

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

        });

        return FilterDataProviderBase;
    }
);
