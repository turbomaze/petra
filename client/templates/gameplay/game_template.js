Template.gameTemplate.onCreated(function() {
    //reset session variables
    Session.set('selected-tile', false);
    Session.set('selected-rack-letter', false);
});

Template.gameTemplate.helpers({
    cells: function() {
        var idxs = [];
        for (var ai = 0; ai < 100; ai++) {
            idxs.push({
                _id: ai,
                letter: Math.random() < 0.4 ? '' :
                    String.fromCharCode(
                        65+Math.floor(26*Math.random())
                    )
            });
        }
        return idxs;
    },

    gameData: function() {
        var rawData = GameRooms.findOne(this._id, {
            fields: {
                playerRacks: 1,
                tiles: 1
            }
        });
        return {
            tiles: rawData.tiles,
            rack: rawData.playerRacks[Meteor.userId()]
        };
    },

    selectedTile: function() {
        return Session.get('selected-tile');
    },

    selectedRackLetter: function() {
        return Session.get('selected-rack-letter');
    }
});

Template.gameTemplate.events({
    'click .tile-elem': function(e, tmpl) {
        var tileId = parseInt(e.target.id.split('-')[1]);
        Session.set('selected-tile', tileId);
    },

    'click .letter-elem': function(e, tmpl) {
        var letterId = parseInt(e.target.id.split('-')[2]);
        Session.set('selected-rack-letter', letterId);
    },

    'click #place-btn': function(e, tmpl) {
        e.preventDefault();

        Meteor.call(
            'placeTile',
            this._id,
            Session.get('selected-tile'),
            Session.get('selected-rack-letter'),
            function(err, result) {
                if (err) return Errors.throw(err.reason);

                if (result.notInRoom) {
                    return Errors.throw(
                        'You\'re not in this game room.'
                    );
                } else if (result.invalidRackId) {
                    return Errors.throw(
                        'The rack item you\'ve selected '+
                        'is invalid.'
                    );
                } else if (result.invalidTileId) {
                    return Errors.throw(
                        'The tile you\'ve selected is '+
                        'invalid.'
                    );
                } else if (result.tileAlreadyFilled) {
                    return Errors.throw(
                        'There\'s already a letter in this '+
                        'tile'
                    );
                }
            }
        );
    }
});