var stage = []; //store piece placements here before sending to the server

function getNextTile(tileId, after) {
    var nextTileId = false;
    if (stage.length >= 2) {
        var axisAligned = [0, 1].map(function(axis) {
            return stage.map(function(placement) {
                return [
                    placement[0]%15,
                    Math.floor(placement[0]/15)
                ];
            }).reduce(function(acc, coords, idx) {
                if (idx === 0) return [coords, true];
                else {
                    return [coords, coords[axis]===acc[0][axis]&&acc[1]];
                }
            }, false)[1];
        });
        var tileX = tileId%15;
        var tileY = Math.floor(tileId/15);
        var diff = after ? 1 : -1;
        if (axisAligned[0]) tileY = Math.max(Math.min(tileY+diff, 14), 0);
        else if (axisAligned[1]) tileX = Math.max(Math.min(tileX+diff, 14), 0);

        nextTileId = tileX+15*tileY;
        if (nextTileId === tileId) nextTileId = false;
    }
    return nextTileId;
}

function stagePlacement(roomId, letter, rackId, tileId) {
    if (tileId === false) return Errors.throw('Select a tile first.');
    else if (letter === false && rackId === false) {
        return;
    }

    //get the current room's data
    var gameData = GameRooms.findOne(roomId, {
        fields: {
            playerRacks: 1,
            tiles: 1,
            turn: 1
        }
    });

    //can only place on their turn
    if (gameData.turn !== Meteor.userId()) {
        return Errors.throw('It isn\'t your turn!');
    }

    //bunch of convenience variables
    var tiles = gameData.tiles;
    var rack = gameData.playerRacks[Meteor.userId()];
    var rackLetter = letter ? letter : rack[rackId].letter;
    var tileLetter = tiles[tileId].letter;

    //deal with the few different tile-rack cases
    if (rackLetter !== false && tileLetter !== false) {
        return Errors.throw('There\'s already a letter in that tile.');
    } else if (rackLetter !== false && tileLetter === false) {
        //find the rack id if you have to
        if (rackId === false) {
            for (var ai = 0; ai < rack.length; ai++) {
                var rawRackLtr = rack[ai].letter;
                var rackLtr = rawRackLtr ? rawRackLtr.toUpperCase() : rawRackLtr;
                var lettersMatch = letter === rackLtr;
                if (lettersMatch && rackLtr !== false) {
                    rackId = ai;
                    break;
                }
            }
            if (rackId === false) return;
        }

        //update the LOCAL collection after placing the letter
        tiles[tileId].letter = rackLetter;
        tiles[tileId].score = rack[rackId].score;
        rack[rackId].letter = false;
        rack[rackId].score = false;
        var propsToUpdate = {
            tiles: tiles
        };
        propsToUpdate['playerRacks.'+Meteor.userId()] = rack;
        GameRooms._collection.update(roomId, {
            $set: propsToUpdate
        });

        //remember your changes so you can undo them later
        stage.push([tileId, rackLetter]);

        //get the next tile id, skipping over placed letters
        var nextTileId = getNextTile(tileId, true);
        while (nextTileId !== false && !!tiles[nextTileId].userId) {
            nextTileId = getNextTile(nextTileId, true);
        }

        //update session variables
        Session.set('selected-letter', false);
        Session.set('selected-rack-item', false);
        Session.set('selected-tile', nextTileId);
    }
}

function reclaimLetter(roomId, tileId, rackId, suppress) {
    //get the current room's data
    var gameData = GameRooms.findOne(roomId, {
        fields: {
            playerRacks: 1,
            tiles: 1
        }
    });
    var rack = gameData.playerRacks[Meteor.userId()];
    if (!rack || tileId === false) return false;

    var stageChangeIdx = stage.reduce(function(ans, change, idx) {
        return change[0] === tileId ? idx : ans;
    }, false);
    if (stageChangeIdx !== false) {
        //it was a staged change so try to reclaim the letter
        if (!rackId) {
            //get the first empty rack spot
            for (var ri = 0; ri < rack.length; ri++) {
                if (!rack[ri].letter) {
                    rackId = ri;
                    break;
                }
            }
            if (rackId === false) return false; //no empty spots
        }
        rack[rackId].letter = gameData.tiles[tileId].letter;
        rack[rackId].score = gameData.tiles[tileId].score;
        gameData.tiles[tileId].letter = false;
        gameData.tiles[tileId].score = false;
        var propsToUpdate = {
            tiles: gameData.tiles
        };
        propsToUpdate['playerRacks.'+Meteor.userId()] = rack;
        GameRooms._collection.update(roomId, {
            $set: propsToUpdate
        });

        //remove this change from the stage
        stage.splice(stageChangeIdx, 1);
        return true;
    } else if (!!gameData.tiles[tileId].letter) {
        //otherwise tell them they can't reclaim it
        if (!suppress) Errors.throw('That\'s not your letter to reclaim.');
        return false;
    }
}

function backspaceLetter(roomId, tileId) {
    //get the current room's data
    var gameData = GameRooms.findOne(roomId, {
        fields: {
            tiles: 1
        }
    });
    if (!gameData.tiles) return false;

    var neighbor = getNextTile(tileId, false);
    if (neighbor === false) {
        if (stage.length === 1) {
            if (stage[0][0]%15 === tileId%15) { //aligned along x
                neighbor = tileId-15 < 0 ? tileId : tileId-15;
            } else if (Math.floor(stage[0][0]/15) === Math.floor(tileId/15)) {
                //aligned along y
                neighbor = tileId%15 === 0 ? tileId : tileId-1;
            }

            //they want to delete the only letter they've placed
            if (stage[0][0] === tileId) neighbor = tileId;
        } else {
            neighbor = tileId;
        }
    }
    var dltd = reclaimLetter(roomId, neighbor, false, true);
    Session.set('selected-tile', neighbor);
}

Template.gameTemplate.onCreated(function() {
    //reset session variables
    Session.set('selected-letter', false);
    Session.set('selected-rack-item', false);
    Session.set('selected-tile', false);
    Session.set('current-turn', false);
});

Template.gameTemplate.onRendered(function() {
    document.addEventListener('keydown', function(e) {
        e.preventDefault();
        e.stopPropagation();

        var roomId = Router.current().params._id;
        var selLetter = String.fromCharCode(e.keyCode);
        if (e.keyCode < 32 || e.keyCode > 126) selLetter = false;
        var sl = Session.get('selected-letter');
        var sr = Session.get('selected-rack-item');
        var st = Session.get('selected-tile');
        if (selLetter !== false && st !== false) {
            stagePlacement(roomId, selLetter, false, st);
        } else {
            Session.set('selected-letter', selLetter);
            Session.set('selected-rack-item', false);
            Session.set('selected-tile', false);

            if (e.keyCode === 8 && st !== false) { //backspace
                backspaceLetter(roomId, st);
            }
        }

        return false;
    }, false);
});

Template.gameTemplate.helpers({
    gameData: function() {
        var rawData = GameRooms.findOne(this._id, {
            fields: {
                tiles: 1,
                title: 1,
                turn: 1,
                winner: 1
            }
        });
        if (!rawData) return [];

        var placedTileIds = stage.map(function(placement) {
            return placement[0];
        });
        var tileIdsToRemove = [];
        for (var ti = 0; ti < rawData.tiles.length; ti++) {
            if (!!rawData.tiles[ti].letter) {
                if (!!rawData.tiles[ti].userId) {
                    rawData.tiles[ti].filledClass = 'filled';
                    //an actual letter is here
                    if (placedTileIds.indexOf(ti) !== -1) { //and so is a staged letter
                        tileIdsToRemove.push(ti);
                    }
                } else {
                    rawData.tiles[ti].filledClass = 'with-letter';
                }
            }

            if (ti === Session.get('selected-tile')) {
                rawData.tiles[ti].selectedClass = 'selected';
            }

            if (ti === 112) {
                rawData.tiles[ti].multClass = 'center';
                rawData.tiles[ti].multText = '&#9733;';
            } else if (rawData.tiles[ti].mult === 2) {
                rawData.tiles[ti].multClass = 'mult-dl';
                rawData.tiles[ti].multText = 'DL';
            } else if (rawData.tiles[ti].mult === 3) {
                rawData.tiles[ti].multClass = 'mult-tl';
                rawData.tiles[ti].multText = 'TL';
            } else if (rawData.tiles[ti].mult === 12) {
                rawData.tiles[ti].multClass = 'mult-dw';
                rawData.tiles[ti].multText = 'DW';
            } else if (rawData.tiles[ti].mult === 13) {
                rawData.tiles[ti].multClass = 'mult-tw';
                rawData.tiles[ti].multText = 'TW';
            }
        }

        //fix stage conflicts
        stage = stage.filter(function(placement) {
            return tileIdsToRemove.indexOf(placement[0]) === -1;
        });

        //detect turn changes
        if (rawData.turn !== Session.get('current-turn')) {
            if (Session.get('current-turn') !== false) {
                var beep = new Audio('/audio/beep.mp3');
                beep.play();
            }
            var turnPref = 'YOUR TURN - ';
            if (document.title.indexOf(turnPref) === 0) { //already there
                if (rawData.turn !== Meteor.userId()) { //not them
                    document.title = document.title.substring(
                        turnPref.length
                    ); //get rid of it
                }
            } else { //it isn't there
                if (rawData.turn === Meteor.userId()) { //it is them
                    document.title = turnPref+document.title;
                }
            }

            Session.set('current-turn', rawData.turn);
        }

        return {
            tiles: rawData.tiles,
            title: rawData.title || 'Game board',
            winner: rawData.winner
        };
    },

    playerRack: function() {
        var rawData = GameRooms.findOne(this._id, {
            fields: {
                playerRacks: 1
            }
        });

        //deal with selected rack items
        var rack = rawData.playerRacks[Meteor.userId()];
        if (!rack) return [];
        var selLetter = Session.get('selected-letter');
        selLetter = selLetter ? selLetter.toUpperCase() : selLetter;
        var foundIt = false;
        for (var ai = 0; ai < rack.length; ai++) {
            var rawRackLtr = rack[ai].letter;
            var rackLtr = rawRackLtr ? rawRackLtr.toUpperCase() : rawRackLtr;
            var lettersMatch = selLetter === rackLtr;
            var idxsMatch = ai === Session.get('selected-rack-item');
            if ((lettersMatch||idxsMatch) && !foundIt && rackLtr !== false) {
                rack[ai].selected = 'selected';
                foundIt = true;
            } else {
                rack[ai].selected = '';
            }
        }

        return rack;
    },

    playersAndScores: function() {
        var rawData = GameRooms.findOne(this._id, {
            fields: {
                players: 1, //array of {ids,usernames}
                playerScores: 1, //object of ids -> scores
                turn: 1
            }
        });
        var playerList = [];
        if (!rawData || !rawData.players) return playerList;
        for (var pi = 0; pi < rawData.players.length; pi++) {
            var playersId = rawData.players[pi]._id;
            playerList.push({
                username: rawData.players[pi].username,
                score: rawData.playerScores[playersId],
                isTurn: rawData.turn === playersId ? 'is-turn':''
            });
        }
        return playerList;
    }
});

Template.gameTemplate.events({
    'click .tile-elem, click .tile-letter': function(e, tmpl) {
        e.preventDefault();

        var roomId = Template.parentData(1)._id;
        var tileId = parseInt(e.target.id.split('-')[1]);
        var sl = Session.get('selected-letter');
        var sr = Session.get('selected-rack-item');
        var st = Session.get('selected-tile');
        if (sr !== false && st === false) {
            return stagePlacement(roomId, false, sr, tileId);
        } else if (sl !== false && st === false) {
            return stagePlacement(roomId, sl, false, tileId);
        } else {
            Session.set('selected-letter', false);
            Session.set('selected-rack-item', false);
            Session.set('selected-tile', tileId === st ? false : tileId);
        }
    },

    'click .rack-letter': function(e, tmpl) {
        e.preventDefault();

        var roomId = Template.parentData(1)._id;
        var rackId = parseInt(e.target.id.split('-')[2]);
        var sl = Session.get('selected-letter');
        var sr = Session.get('selected-rack-item');
        var st = Session.get('selected-tile');
        if (this.letter !== false) {
            if (st !== false) {
                return stagePlacement(roomId, false, rackId, st);
            } else {
                Session.set('selected-letter', false);
                Session.set('selected-rack-item', rackId===sr?false:rackId);
                Session.set('selected-tile', false);
            }
        } else {
            if (st !== false) reclaimLetter(roomId, st, rackId);
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
                rack[ri].score = LETTER_PTS[rack[ri].letter.toLowerCase()];
                tiles[stage[stageIdx][0]].letter = false;
                tiles[stage[stageIdx][0]].score = false;
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

        //remove all selections
        Session.set('selected-letter', false);
        Session.set('selected-rack-item', false);
        Session.set('selected-tile', false);
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
                } else if (result.gameOver) {
                    return Errors.throw(
                        'This game is already over.'
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
                } else if (result.mustPlaceCenter) {
                    return Errors.throw(
                        'The first word has to go through the center.'
                    );
                } else if (result.doesNotBranch) {
                    return Errors.throw(
                        'New words need to branch off of old words.'
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

                    //ga
                    ga('send', 'event', 'game', 'move','word');
                    if (result.gameOver) {
                        ga('send', 'event', 'game', 'end');
                    }
                }
            }
        );
    },

    'click #pass-move-btn': function(e, tmpl) {
        e.preventDefault();

        if (confirm('Are you sure you want to pass your turn?')) {
            Meteor.call(
                'makeMove',
                this._id,
                [false],
                function (err, result) {
                    if (err) return Errors.throw(err.reason);

                    if (result.notInRoom) {
                        return Errors.throw(
                            'You\'re not in this game room.'
                        );
                    } else if (result.gameOver && !result.success) {
                        return Errors.throw(
                            'This game is already over.'
                        );
                    } else if (result.notTheirTurn) {
                        return Errors.throw(
                            'It isn\'t your turn!'
                        );
                    } else {
                        //ga
                        ga('send', 'event', 'game', 'move', 'pass');
                        if (result.gameOver) {
                            ga('send', 'event', 'game', 'end');
                        }
                    }
                }
            );
        }
    },

    'click #forfeit-btn': function(e, tmpl) {
        e.preventDefault();

        if (confirm('Are you sure you want to forfeit?')) {
            Meteor.call('removeJoinAuth', function (err, result) {
                if (err) return Errors.throw(err.reason);

                if (result.notLoggedOn) {
                    return Errors.throw(
                        'You\'re not logged in.'
                    );
                } else if (result.notInRoom) {
                    return Errors.throw(
                        'You need to be in a room to forfeit.'
                    );
                } else if (result.success) {
                    //ga
                    ga('send', 'event', 'game', 'forfeit');

                    Router.go('home');
                }
            });
        }
    }
});
