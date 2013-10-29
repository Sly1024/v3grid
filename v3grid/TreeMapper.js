ClassDefReq('v3grid.TreeMapper', {
    extends: 'v3grid.Observable',
    requires:['v3grid.TreeRenderer'],

    treeColumnIdx: 0,
    indentation: 16,

    ctor: function TreeMapper(config) {
        v3grid.Adapter.merge(this, config);

        this.renderer = this.renderer || v3grid.TreeRenderer;

        this.openNodes = {};    // TODO: when to flush??
        this.refresh();

        if (this.dataProvider.addListener) {
            this.dataProvider.addListener('dataChanged', this.refresh, this);
        }
    },

    init: function (grid, config) {
        var column = config.columns[this.treeColumnIdx];

        this.treeColumnDataIdx = column.dataIndex;
        var rendererConfig = {
            renderer:  grid.getRenderer(column.renderer || grid.itemRenderer),
            rendererConfig: column.rendererConfig,
            treeMapper: this
        };

        column.renderer = this.renderer;
        column.rendererConfig = rendererConfig;
    },

    // DataProvider API - start
    getRowCount: function () {
        return this.nodes.length;
    },

    getRowId: function (row) {
        return this.nodes[row].id;
    },

    getCellData: function (row, colDataIdx) {
        if (colDataIdx == '__treemapper_row') return row;
        return this.dataProvider.getCellData(this.nodes[row].id, colDataIdx);
    },

    refresh: function () {
        var nodes = this.nodes = [],
            openNodes = this.openNodes;

        this.nodeCache = {};
        this.expandNode(-1, true);

        for (var i = 0; i < nodes.length; ++i) {
            if (openNodes[nodes[i].id]) this.expandNode(i, true);
        }
        this.fireEvent('dataChanged');
    },
    // DataProvider API - end

    expandNode: function(linearIdx, suppressEvent) {
        var node = this.nodes[linearIdx],
            nodeId = node ? node.id : this.dataProvider.getRootId(),
            childrenInfo = this.nodeCache[nodeId] || this.dataProvider.getChildrenInfo(nodeId);

        if (childrenInfo && childrenInfo.length) {
            Array.prototype.splice.apply(this.nodes, [linearIdx+1, 0].concat(childrenInfo));
            this.openNodes[nodeId] = true;
            if (!suppressEvent) this.fireEvent('dataChanged');
            return true;
        }

        return false;
    },

    collapseNode: function (linearIdx, suppressEvent) {
        var nodes = this.nodes,
            node = nodes[linearIdx],
            nodeId = node ? node.id : '',
            endIdx = ++linearIdx,
            depth = node.depth,
            len = nodes.length;

        while (endIdx < len && nodes[endIdx].depth > depth) ++endIdx;

        if (linearIdx < endIdx) {
            this.nodeCache[nodeId] = nodes.splice(linearIdx, endIdx-linearIdx);
            delete this.openNodes[nodeId];
            if (!suppressEvent) this.fireEvent('dataChanged');
            return true;
        }

        return false;
    },

    /*
     * level:
     * 0 -> close
     * n -> expand to level n
     * Infinity -> expand all
     */
    expandToLevel: function (level) {
        var nodes = this.nodes,
            openNodes = this.openNodes;

        for (var i = 0; i < nodes.length; ++i) {
            var node = nodes[i],
                shouldBeOpen = node.depth <= level,
                nodeId = node ? node.id : '';

            if (openNodes[nodeId]) {
                if (!shouldBeOpen) this.collapseNode(i, true);
            } else {
                if (shouldBeOpen) this.expandNode(i, true);
            }
        }

        this.fireEvent('dataChanged');
    },

    toggleNode: function (row, evt) {
        var node = this.nodes[row];
        if (this.openNodes[node.id]) {
            this.collapseNode(row);
        } else {
            this.expandNode(row);
        }
    }
});