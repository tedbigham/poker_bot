/** responses from actions */

find = require('underscore').find;

function Results(bot) {
    this.authenticate = function() {
        bot.actions.casinoSubscribe();
    };

    this.casinoGetTable = function(message) {
        var tableID = message.result.table.tableID;
        bot.minBuyIn = message.result.table.handConfiguration.minBuyIn;
        console.log('TABLE: '+ message.result.table.name);

        // are we already sitting?
        var mySeat = find(message.result.table.seats, function(seat) { return seat.playerID == bot.userID });
        if (mySeat) {
            bot.seat = mySeat.seat;
            console.log('already sitting at seat ' + mySeat.seat);
            return;
        }

        // take an empty seat
        var emptySeat = find(message.result.table.seats, function(seat) { return !seat.sitting });
        if (emptySeat) {
            console.log('requesting seat ' + emptySeat.seat);
            bot.seat = emptySeat.seat;
            bot.actions.tableRequestSeat(tableID, emptySeat.seat);
        } else {
            console.log('table is full');
            bot.actions.tableUnsubscribe(tableID);
            bot.actions.tableSubscribeImmediate();
        }
    };

    this.casinoSubscribe = function(message) {
        // clean up old table subscriptions except for one
        while(message.result.tableSubscriptions.length > 1) {
            var id = message.result.tableSubscriptions.pop();
            bot.actions.tableStandUp(id);
        }
        if (message.result.tableSubscriptions.length > 0) {
            // rejoin current table
            bot.tableID = message.result.tableSubscriptions[0];
            console.log('rejoin table ' + bot.tableID);
            bot.actions.casinoGetTable(bot.tableID);
        } else {
            // join a new table
            console.log('join new table');
            bot.actions.tableSubscribeImmediate();
        }

    };

    this.tableRequestSeat = function(message) {
        if (message.status == 'ok') {
            bot.tableID = message.result.tableID;
            if(!bot.chipStack)
                bot.actions.tableBuyIn(bot.tableID, bot.minBuyIn);
        } else {
            bot.seat = undefined;
            bot.actions.tableUnsubscribe(message.result.tableID);
            bot.actions.casinoSubscribe();
        }
    };

    // try to populate as much state as we can, in case we've connected in the middle of a hand
    this.tableSubscribe = function(message) {
        bot.tableID = message.result.tableData.tableDescription.tableID;
        bot.bigBlind = message.result.tableData.tableDescription.handConfiguration.startingBB;
        var currentHand = message.result.tableData.handCurrentState;

        // find our seat
        var mySeat = find(message.result.tableData.seats, function(seat) { return seat.playerID == bot.userID });
        if (mySeat) {
            bot.seat = mySeat.seat;
        }
        // if there's a hand in progress, try to find our cards
        if (currentHand && currentHand.boardCards) {
            bot.board = currentHand.boardCards;

            if (bot.seat) {
                var myHand = find(currentHand.seatState, function (seat) { return seat.seat == bot.seat; });
                if (myHand) {
                    bot.cards = seat.cards;
                }
            }
        }
        bot.status();
    };

    // leave the table completely after we stand up
    this.tableStandUp = function(message) {
        bot.actions.tableUnsubscribe(message.result.tableID);
    };

    this.tableUnsubscribe = function(message) { };
    this.tableBuyIn = function(message) { };
    this.handPostAction = function(message) { };
    this.tableSubscribeImmediate = function(message) { };
    this.playerAcceptFriendInvite = function(message) { };
}

module.exports= Results;
