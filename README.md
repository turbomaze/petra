Petra
====================================================================
A Meteor.js app that lets you play scrabble online with your friends.

## Usage
When users navigate to the [Petra homepage](http://petra.meteor.com),
they're faced with a login form and list of game rooms. Once they've
joined a room, they're presented with a waiting page until the game
starts. This lobby functionality generalizes to all kinds of games,
but after this, Petra is just scrabble. I'll make a Meteor package
for this game room lobby system soon.

### Accounts
No one likes registering for new websites, so Petra has a very loose
registration system. Users can just type a username to log in; passwords
are optional.

### Game Rooms
Game rooms are either password protected or they're not. In order to
join a password protected game room -- either via the main page or via
a direct link -- users need to provide the correct password.

The user who created the game room is designated the room's owner, which
gives them the power to start the game and delete the game room. If they
leave the game room, another user is randomly chosen to be the room's
owner.

## Game Play
There's no game play functionality just yet. It's just a lobby system right
now.