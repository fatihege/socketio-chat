module.exports = async (req, res, next) => {
    if (req.user && await req.user.isAdmin()) {
        return next();
    } else {
        return res.redirect('/');
    }
}