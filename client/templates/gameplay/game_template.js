Template.gameTemplate.onCreated(function() {
    //reset session variables
    Session.set('selected-tile', false);
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
    }
});

var stage = []; //store piece placements here before sending to the server

Template.gameTemplate.events({
    'click .tile-elem': function(e, tmpl) {
        e.preventDefault();
        var tileId = parseInt(e.target.id.split('-')[1]);
        Session.set('selected-tile', tileId);
    },

    'click .letter-elem': function(e, tmpl) {
        e.preventDefault();

        var tileId = Session.get('selected-tile');
        if (tileId === false) return Errors.throw('Select a tile first.');

        //get the current room's data
        var currRoom = Template.parentData(1)._id;
        var gameData = GameRooms.findOne(currRoom, {
            fields: {
                playerRacks: 1,
                tiles: 1
            }
        });

        //bunch of convenience variables
        var tiles = gameData.tiles;
        var rack = gameData.playerRacks[Meteor.userId()];
        var rackId = parseInt(e.target.id.split('-')[2]);
        var rackLetter = rack[rackId].letter;
        var tileLetter = tiles[tileId].letter;

        //deal with the few different tile-rack cases
        if (rackLetter !== false && tileLetter !== false) {
            return Errors.throw('There\'s already a letter in that tile.');
        } else if (rackLetter === false && tileLetter !== false) {
            var stageChangeIdx = stage.reduce(function(ans, change, idx) {
                return change[0] === tileId ? idx : ans;
            }, false);
            if (stageChangeIdx !== false) {
                //it was a staged change so reclaim the letter
                rack[rackId].letter = tiles[tileId].letter;
                tiles[tileId].letter = false;
                var propsToUpdate = {
                    tiles: tiles
                };
                propsToUpdate['playerRacks.'+Meteor.userId()] = rack;
                GameRooms._collection.update(currRoom, {
                    $set: propsToUpdate
                });

                //remove this change from the stage
                stage.splice(stageChangeIdx, 1);
            } else { //otherwise tell them they can't reclaim it
                return Errors.throw('That\'s not your letter to reclaim.');
            }
        } else if (rackLetter !== false && tileLetter === false) {
            //update the LOCAL collection after placing the letter
            var letter = rack[rackId].letter;
            tiles[tileId].letter = letter;
            rack[rackId].letter = false;
            var propsToUpdate = {
                tiles: tiles
            };
            propsToUpdate['playerRacks.'+Meteor.userId()] = rack;
            GameRooms._collection.update(currRoom, {
                $set: propsToUpdate
            });

            //remember your changes so you can undo them later
            stage.push([tileId, letter]);
        }
    },

    'click #recall-btn': function(e, tmpl) {
        e.preventDefault();

        //get the game data you need
        var gameData = GameRooms._collection.findOne(this._id, {
            fields: {
                playerRacks: 1,
                tiles: 1
            }
        }); //search local collection?
        var tiles = gameData.tiles;
        var rack = gameData.playerRacks[Meteor.userId()];

        //undo all the staged changes
        var stageIdx = 0;
        for (var ri = 0; ri < rack.length && stageIdx < stage.length; ri++) {
            if (rack[ri].letter === false) {
                rack[ri].letter = stage[stageIdx][1];
                tiles[stage[stageIdx][0]].letter = false;
                stageIdx++;
            }
        }
        stage = [];

        //send the undone version back to the minimongo collection
        var propsToUpdate = {
            tiles: tiles
        };
        propsToUpdate['playerRacks.'+Meteor.userId()] = rack;
        GameRooms._collection.update(this._id, {
            $set: propsToUpdate
        });
    },

    'click #submit-move-btn': function(e, tmpl) {
        e.preventDefault();

        Meteor.call(
            'makeMove',
            this._id,
            stage,
            function(err, result) {
                if (err) return Errors.throw(err.reason);

                if (result.notInRoom) {
                    return Errors.throw(
                        'You\'re not in this game room.'
                    );
                } else if (result.notTheirTurn) {
                    return Errors.throw(
                        'It isn\'t your turn!'
                    );
                } else if (result.invalidRackId) {
                    return Errors.throw(
                        'One of the letters you\'ve selected is invalid.'
                    );
                } else if (result.invalidTileId) {
                    return Errors.throw(
                        'You can only place letters on empty tiles.'
                    );
                } else if (result.notALine) {
                    return Errors.throw(
                        'All of your letters need to be in a single line.'
                    );
                } else if (result.notConnected) {
                    return Errors.throw(
                        'All of your letters need to be connected.'
                    );
                } else if (!!result.notAWord) {
                    return Errors.throw(
                        'The following words were invalid: '+
                        result.notAWord.join(', ')
                    );
                } else if (result.success) {
                    stage = []; //clear the stage; these changes will live on!
                }
            }
        );
    }
});