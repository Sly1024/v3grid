define('v3grid/TreeMapper', [],
    function () {
        var TreeMapper = function (treeDataProvider) {
            this.tdp = treeDataProvider;
            this.refresh();
        };

        TreeMapper.prototype = {
            // public API
            refresh: function () {
                var rootChildrenCount = this.tdp.getChildCount([]);

                // [] = { len:number, idx:Array }
                this.ranges = [{ len: rootChildrenCount, idx: [0] }];
                this.totalCount = rootChildrenCount;
                this.removed = {};
                this.linearCache = {};
            },

            getLinearIdx: function (treeIdx) {
                var ridx = this.searchTIdx(treeIdx);
                var ranges = this.ranges;
                var tidx = ranges[ridx].idx;

                return this.rangeSum + treeIdx[treeIdx.length-1] - tidx[tidx.length-1];
            },

            getTreeIdx: function (linearIdx) {
                var val = this.linearCache[linearIdx];
                if (val) return val.concat();

                val = this.getTreeIdxImp(linearIdx)
                this.linearCache[linearIdx] = val;

                return val.concat();
            },

            isOpen: function (linearIdx) {
                var ranges = this.ranges;
                var ridx = this.searchLin(linearIdx);
                // open if it's the last item in the range and the next range exists and has a longer treeindex (depth)
                return ridx+1 < ranges.length && this.rangeSum + ranges[ridx].len == linearIdx + 1 &&
                    ranges[ridx+1].idx.length > ranges[ridx].idx.length;
            },

            insertChildren: function (linearIdx) {
                var tidx = this.getTreeIdxImp(linearIdx);
                var tidxstr = tidx.toString();
                var count;

                var toInsert = this.removed[tidxstr];
                if (toInsert) {
                    delete this.removed[tidxstr];
                    count = toInsert.pop();
                } else {
                    count = this.tdp.getChildCount(tidx);
                }

                var ridx = this.rangeIdx;
                var ranges = this.ranges;

                var splitLeft = linearIdx+1 - this.rangeSum;
                var range = ranges[ridx];

                if (splitLeft == range.len) {
                    if (!toInsert) {
                        var newTreeIdx = range.idx.concat(0);
                        newTreeIdx[newTreeIdx.length-2] += splitLeft-1; //range.len -1
                        toInsert = [{ len: count, idx: newTreeIdx }];
                    }
                } else {
                    var splitIdx = range.idx.concat();
                    splitIdx[splitIdx.length-1] += splitLeft;
                    if (!toInsert) {
                        var newTreeIdx = splitIdx.concat(0);
                        newTreeIdx[newTreeIdx.length-2] = splitIdx[splitIdx.length-1]-1;
                        toInsert = [{ len: count, idx: newTreeIdx }];
                    }
                    toInsert.push({ len: range.len - splitLeft, idx: splitIdx });
                    range.len = splitLeft;
                }

                Array.prototype.splice.apply(ranges, [ridx+1, 0].concat(toInsert));
                this.linearCache = {};
                this.totalCount += count;
            },

            removeChildren: function (linearIdx) {
                var ranges = this.ranges;
                var tidx = this.getTreeIdxImp(linearIdx);
                var tidxstr = tidx.toString();
                var ridx1 = this.rangeIdx;
                var leftSum = this.rangeSum + ranges[ridx1].len;
                ++ridx1;
                ++tidx[tidx.length-1];
                var ridx2 = this.searchTIdx(tidx);

                var removeCount = this.rangeSum - leftSum;
                var removed = ranges.splice(ridx1, ridx2-ridx1);
                if (removed.length > 1) {
                    removed.push(removeCount);
                    this.removed[tidxstr] = removed;
                }
                this.linearCache = {};
                this.totalCount -= removeCount;

                // check if the two neighbors can be contracted
                if (ridx1 >= ranges.length) return;

                var r1 = ranges[ridx1-1], r2idx = ranges[ridx1].idx;
                if (r1.idx.length != r2idx.length) return;
                var rstart = r1.idx.concat();
                rstart[rstart.length-1] += r1.len;

                if (this.compareTIdx(rstart, r2idx) == 0) {
                    r1.len += ranges[ridx1].len;
                    ranges.splice(ridx1, 1);
                }
            },

            //private API

            getTreeIdxImp: function (linearIdx) {
                var tidx = this.ranges[this.searchLin(linearIdx)].idx.concat();
                tidx[tidx.length-1] += linearIdx - this.rangeSum;
                return tidx;
            },

            // returns a range index that contains the linear Idx
            searchLin: function (linIdx) {
                var ranges = this.ranges;
                var len = ranges.length;
                var idx = 1;
                var sum = ranges[0].len;

                while (idx < len && sum <= linIdx) {
                    sum += ranges[idx++].len;
                }
                if (sum > linIdx) sum -= ranges[--idx].len;

                this.rangeSum = sum;

                return this.rangeIdx = idx;
            },

            searchTIdx: function (tIdx) {
                var ranges = this.ranges;
                var len = ranges.length;
                var idx = 0;
                var sum = 0;
                var comp = this.compareTIdx;
                var lastComp;

                while (idx < len)  {
                    lastComp = comp(tIdx, ranges[idx].idx);
                    if (lastComp > 0)
                        sum += ranges[idx++].len;
                    else
                        break;
                }

                var stepback = false;
                if (idx >= len || lastComp < 0 && idx > 0) {
                    var lastIdx = ranges[idx-1].idx.concat();
                    lastIdx[lastIdx.length-1] += ranges[idx-1].len;
                    stepback = comp(tIdx, lastIdx) < 0;
                }
                if (stepback) sum -= ranges[--idx].len;

                this.rangeSum = sum;
                return this.rangeIdx = idx;
            },

            compareTIdx: function (t1, t2) {
                var idx = 0, t1len = t1.length, t2len = t2.length;
                while (idx < t1len && idx < t2len && t1[idx] == t2[idx]) ++idx;
                if (idx < t1len && idx < t2len) {
                    return t1[idx] - t2[idx];
                } else {
                    return t1len - t2len;
                }
            }

        };

        return TreeMapper;
    }
);

