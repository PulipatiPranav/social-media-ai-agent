const mongoose = require('mongoose');

module.exports = async () => {
  // Close MongoDB connection if it exists
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
  }
  
  // Close mongoose connection
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  
  // Clear all timers
  if (global.gc) {
    global.gc();
  }
  
  // Force exit after cleanup
  setTimeout(() => {
    process.exit(0);
  }, 100);
};