module.exports = (req, res, next) => {
    console.log(req.user)
    if (
        req.session.isAuthenticated &&
        req.user && req.user.activated
    ) {
        return res.redirect('/chat');
    }

    next();
}
