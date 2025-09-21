const cron = require('node-cron');
const User = require('../models/user');

// Reset dayLikesCount to 0 for all users every night at 11 PM
cron.schedule('0 23 * * *', async () => {
    try {
        console.log('Starting daily reset of dayLikesCount...');
        
        const BATCH_SIZE = 10;
        let totalUpdated = 0;
        let lastId = null;
        let hasMore = true;
        
        while (hasMore) {
            let query = { dayLikesCount: { $gt: 0 } };
            if (lastId) {
                query._id = { $gt: lastId };
            }
            
            const users = await User.find(query, { _id: 1 })
                .sort({ _id: 1 })
                .limit(BATCH_SIZE);

            console.log('users fetched', users);
            
            if (users.length === 0) {
                hasMore = false;
                break;
            }
            
            const userIds = users.map(user => user._id);
            lastId = users[users.length - 1]._id; // Update cursor
            
            const result = await User.updateMany(
                { _id: { $in: userIds } },
                { $set: { dayLikesCount: 0 } }
            );
            
            totalUpdated += result.modifiedCount;
            console.log(`Cursor batch processed: ${result.modifiedCount} users. Total: ${totalUpdated}, LastId: ${lastId}`);
            
            // Small delay to prevent overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        console.log(`Daily reset completed. Total updated: ${totalUpdated} users.`);
    } catch (error) {
        console.error('Error during daily reset of dayLikesCount:', error);
    }
});

// Reduce dayLikesCount by 1 for users with dayLikesCount = 8, runs every hour except at 11 PM
cron.schedule('0 4-22 * * *', async () => {
    try {
        console.log('Starting hourly reduction of dayLikesCount for users with count = 8...');
        
        const BATCH_SIZE = 10;
        let totalUpdated = 0;
        let lastId = null;
        let hasMore = true;
        
        while (hasMore) {
            let query = { dayLikesCount: 8 };
            if (lastId) {
                query._id = { $gt: lastId };
            }
            
            const users = await User.find(query, { _id: 1 })
                .sort({ _id: 1 })
                .limit(BATCH_SIZE);
            
            if (users.length === 0) {
                hasMore = false;
                break;
            }
            
            const userIds = users.map(user => user._id);
            lastId = users[users.length - 1]._id; // Update cursor
            
            const result = await User.updateMany(
                { _id: { $in: userIds } },
                { $inc: { dayLikesCount: -1 } }
            );
            
            totalUpdated += result.modifiedCount;
            console.log(`Hourly reduction batch processed: ${result.modifiedCount} users. Total: ${totalUpdated}, LastId: ${lastId}`);
            
            // Small delay to prevent overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        console.log(`Hourly reduction completed. Total updated: ${totalUpdated} users.`);
    } catch (error) {
        console.error('Error during hourly reduction of dayLikesCount:', error);
    }
});


