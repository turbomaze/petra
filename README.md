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
Once the room owner starts the game, everyone receives 7 randomly chosen
letters per [Scrabble's letter distribution](https://en.wikipedia.org/wiki/Scrabble_letter_distributions)
(minus the blank tiles). Players then place their tiles on a 15 by 15 grid to
form words (from the [SOWPODS](https://en.wikipedia.org/wiki/SOWPODS) dictionary).

Words need to lie along vertical or horizontal lines, and they need to branch
off of words that are already on the board (or go through the center). The
amount of points each word is worth depends on its constituent letters and any
multiplier tiles it lies on. There are double-letter, double-word, triple-letter,
and triple-word multiplier tiles.

If players can't think of any words, they can pass their turns with no penalty.
But if everyone passes consecutively, the game ends and the player with
the most points is declared the winner. The only other way the game can end is
if there are no more tiles to distribute to players and someone uses up
all of their letters.