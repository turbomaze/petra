if (Games.find().count() === 0) {
    var now = new Date().getTime();

    var tomId = Meteor.users.insert({
        profile: { name: 'Tom Coleman' }
    });
    var tom = Meteor.users.findOne(tomId);
    var sachaId = Meteor.users.insert({
        profile: { name: 'Sacha Greif' }
    });
    var sacha = Meteor.users.findOne(sachaId);

    Games.insert({
        title: 'Casual Scrabual',
        userId: sacha._id,
        author: sacha.profile.name,
        maxPlayers: 4,
        players: [sacha._id],
        open: true,
        createdAt: new Date(now - 1*3600*1000)
    });

    Games.insert({
        title: 'Petra Tournament Finals',
        userId: tom._id,
        author: tom.profile.name,
        maxPlayers: 3,
        players: [tom._id],
        open: true,
        createdAt: new Date(now - 3*3600*1000)
    });
}