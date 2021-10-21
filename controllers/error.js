exports.get404Page = (req, res) => {
    res.status(404).render('error/error', {
        title: 'Page Not Found',
        code: 404,
        message: 'Page Not Found',
        admin: req.url.startsWith('/admin')
    });
}
