ClassDef('v3grid.InlineFilterHeaderRenderer',
    ['v3grid/Adapter'],
    function (Adapter) {
        return {
            extends: 'v3grid.WrapperRenderer',

            ctor: function InlineFilterHeaderRenderer(config) {
                var me = this;
                me.config = config;

                var temp = document.createElement('div');
                temp.innerHTML = '<table width="100%" height="100%"><tr style="height:100%"><td></td></tr><tr><td valign="bottom"><input type="text" style="width: 100%"></td></tr></table>';
                me.view = temp.firstChild;
                me.textInput = me.view.getElementsByTagName('input')[0];

                me.bufferedInputChanged = Adapter.createBuffered(me.textInputChanged, 200, me);
                Adapter.arrayEach(['change', 'keydown', 'paste', 'input'], function (event) {
                    Adapter.addListener(me.textInput, event, me.bufferedInputChanged, me);
                });

                me.rendererContainer = me.view.getElementsByTagName('td')[0];
                me.updateRenderer(config);
            },

            setConfig: function (config) {
                this.super.setConfig.call(this, config);
                this.textInput.value = config.filter.filterString;
            },

            textInputChanged: function () {
                var str = this.textInput.value;
                var filterDP = this.config.filterDataProvider;
                var filter = this.config.filter;
                filter.filterString = str || '';
                if (str) {
                    filterDP.addFilter(filter);
                } else {
                    filterDP.removeFilter(filter);
                }
                filterDP.refresh();
            }
        };
    }
);
