const patterns = {
    email: {
        name: 'Email',
        pattern: /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
    }
}

module.exports = (body, validation) => {
    if (!body && !validation) {
        return { patterns };
    }

    const bodyKeys = Object.keys(body);
    let errors = [];

    bodyKeys.map((k) => {
        if (!validation[k]) return;

        const vd = validation[k];
        const val = body[k];

        if (vd.required && (!val || !(vd.trim ? val.trim() : val).length)) {
            errors.push(`${vd.name || k} is required.`);
        }

        if (vd.min && (vd.trim ? val.trim() : val).length < vd.min) {
            errors.push(`${vd.name || k} must be at least ${vd.min} characters.`);
        }

        if (vd.max && (vd.trim ? val.trim() : val).length > vd.max) {
            errors.push(`${vd.name || k} must be no more than ${vd.max} characters.`);
        }

        if (vd.pattern && !(vd.trim ? val.trim() : val).match(vd.pattern.pattern)) {
            errors.push(`${vd.name || k} entered does not match the ${vd.pattern.name.toLowerCase() || k.toLowerCase()} pattern.`);
        }

        if (vd.confirm && (!body[`${k}_confirm`] || body[`${k}_confirm`] !== body[k])) {
            errors.push(`${vd.name || k} not confirmed.`);
        }
    });

    return (errors && errors.length) ? errors : null;
}
