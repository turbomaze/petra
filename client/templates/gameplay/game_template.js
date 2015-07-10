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

var stage = []; //store piece placements here before sending to the server

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

        //get the game data you need
        var gameData = GameRooms.findOne(this._id, {
            fields: {
                playerRacks: 1,
                tiles: 1
            }
        });
        var tiles = gameData.tiles;
        var tileId = Session.get('selected-tile');
        var rack = gameData.playerRacks[Meteor.userId()];
        var rackId = Session.get('selected-rack-letter');

        //some basic error checking
        if (tileId === false) {
            return Errors.throw('You must select a tile.');
        }

        if (rackId === false) {
            return Errors.throw('You must select a letter on your rack.');
        }

        if (!rack[rackId].letter) {
            return Errors.throw('There\'s no letter in that rack slot.');
        }

        if (!!tiles[tileId].letter) {
            return Errors.throw('There\'s already a letter there.');
        }

        //update the LOCAL collection with the changes
        tiles[tileId].letter = rack[rackId].letter;
        rack[rackId].letter = false;
        var propsToUpdate = {
            tiles: tiles
        };
        propsToUpdate['playerRacks.'+Meteor.userId()] = rack;
        GameRooms._collection.update(this._id, {
            $set: propsToUpdate
        });

        //remember your changes so you can undo them later
        stage.push([
            Session.get('selected-tile'),
            Session.get('selected-rack-letter')
        ]);
    },

    'click #recall-btn': function(e, tmpl) {
        //get the game data you need
        var gameData = GameRooms.findOne(this._id, {
            fields: {
                playerRacks: 1,
                tiles: 1
            }
        }); //search local collection?
        var tiles = gameData.tiles;
        var rack = gameData.playerRacks[Meteor.userId()];

        //undo all the staged changes
        stage.map(function(placement) {
            rack[placement[1]].letter = tiles[placement[0]].letter;
            tiles[placement[0]].letter = false;
        });
        stage = [];

        //send the undone version back to the minimongo collection
        var propsToUpdate = {
            tiles: tiles
        };
        propsToUpdate['playerRacks.'+Meteor.userId()] = rack;
        GameRooms._collection.update(this._id, {
            $set: propsToUpdate
        });
    }
});