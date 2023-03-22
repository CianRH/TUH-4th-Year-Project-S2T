const LocalStrategy = require('passport-local').Strategy
const bcrypt = require("bcrypt");
const { User } = require("./s3");
const mongoose = require('mongoose');


function initialize(passport, getUserByEmail, getUserById) {
    //const authenticateUser = async (email, password, done) => {
    //    const user = getUserByEmail(email)
    //    if (user == null) {
    //        return done(null, false, {message: 'No user with that email'})
    //    }
    //
    //    try {
    //        if (await bcrypt.compare(password, user.password)) {
    //            return done(null,user)
    //        } else {
    //            return done(null, false, {message: 'Invalid password'})
    //        }
    //    } catch (e) {
    //        return done(e)
    //    }
    //}
    //passport.use(new LocalStrategy({ usernameField: 'email'}, authenticateUser))
    passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
        try {
            const user = await User.findOne({ email: email });
            if (!user) {
                return done(null, false, { message: 'Incorrect email.' });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Incorrect password.' });
            }
        } catch (error) {
            return done(error);
        }
    }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findOne({ id: id });
            done(null, user);
        } catch (err) {
            done(err);
        }
    });




    //passport.serializeUser((user, done) =>done(null, user.id))
    //passport.deserializeUser((id, done) => {
    //    return done(null, getUserById(id))
    //})
}

module.exports = initialize