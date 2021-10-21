module.exports = (req, res, next) => {
    if (req.session.isAuthenticated && req.user && req.user.activated) {
        return res.redirect('back');
    }

    next();
}
