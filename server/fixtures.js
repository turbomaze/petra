if (GameRooms.find().count() === 0) {
    var now = new Date().getTime();

    var tomId = Meteor.users.insert({
        profile: { name: 'Tom Coleman' }
    });
    var tom = Meteor.users.findOne(tomId);
    var sachaId = Meteor.users.insert({
        profile: { name: 'Sacha Greif' }
    });
    var sacha = Meteor.users.findOne(sachaId);

    GameRooms.insert({
        title: 'Casual Scrabual',
        passwordProtected: false,
        password: '',
        userId: sacha._id,
        author: sacha.profile.name,
        maxPlayers: 4,
        players: [sacha._id],
        open: true,
        createdAt: new Date(now - 1*3600*1000)
    });

    GameRooms.insert({
        title: 'Petra Tournament Finals',
        passwordProtected: true,
        password: 'foobar',
        userId: tom._id,
        author: tom.profile.name,
        maxPlayers: 3,
        players: [tom._id],
        open: true,
        createdAt: new Date(now - 3*3600*1000)
    });
}