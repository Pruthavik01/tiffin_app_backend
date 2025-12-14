const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    mobile:Number,
    address:String,
    email: String,
    password: String,
    role: { type: String, enum: ['user', 'provider'], default: 'user' }
});

const User = mongoose.model('User', userSchema);

module.exports = User;