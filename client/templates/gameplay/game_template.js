Template.gameTemplate.helpers({
    cells: function() {
        var idxs = [];
        for (var ai = 0; ai < 100; ai++) {
            idxs.push({
                _id: ai,
                letter: String.fromCharCode(
                    65+Math.floor(26*Math.random())
                )
            });
        }
        return idxs;
    }
});