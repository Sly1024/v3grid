Ext.onReady(function () {
    var iterations = 10000000;
    var statistics = {};

    function addStat(name, val) {
        statistics[name] = (statistics[name] || 0) + val;
    }

    function test_array(prefix) {
        var t0 = +new Date();
        var obj = eval(prefix);
        var t1 = +new Date();

        addStat(prefix + '_create', t1 - t0);

        var t0 = +new Date();
        for (var i = iterations; i >= 0; --i) {
            obj[i] = i;
        }
        var t1 = +new Date();

        addStat(prefix + '_set', t1 - t0);

        var t0 = +new Date();
        for (var i = iterations; i >= 0; --i) {
            var x = obj[i];
        }
        var t1 = +new Date();

        addStat(prefix + '_get', t1 - t0);

        var t0 = +new Date();
        for (var i = iterations; i >= 0; --i) {
            ++obj[i];
        }
        var t1 = +new Date();

        addStat(prefix + '_inc', t1 - t0);
    }

    console.log('---------------------------------------------------');
    console.log('testing...');

    for (var t=0; t<1; ++t) {
        test_array('new Object()');
        test_array('new Array()');
        test_array('new Array(iterations)');
        test_array('new Uint8Array()');
        test_array('new Uint8Array(iterations)');
        test_array('new Uint32Array()');
        test_array('new Uint32Array(iterations)');
    }


    for (var key in statistics) {
        console.log(key + ':' + statistics[key]);
    }

});