module.exports = (req, res, next) => {
    if (!req.session.isAuthenticated || !req.session.user) {
        if (req.user && !req.user.activated) {
            req.session.flashMessage = 'This account not activated.';
        }

        req.session.redirectTo = req.url;

        return res.redirect('/login');
    }

    next();
}
