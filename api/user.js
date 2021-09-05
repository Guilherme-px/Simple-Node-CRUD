const bcrypt = require('bcrypt-nodejs')

module.exports = app => {
    const { existsOrError, notExistsOrError, equalsOrError } = app.api.validation

    const encryptPassword = password => {
        const salt = bcrypt.genSaltSync(10)
        return bcrypt.hashSync(password, salt)
    }

    const save = async(req, res) => {
        const user = { ...req.body }

        if(req.params.id) user.id = req.params.id

        if (!req.originalUrl.startsWith('/users')) user.admin = false
        if (!req.user || !req.user.admin) user.admin = false

        if(user.id) {
            try {
                existsOrError(user.name, 'Enter your name!')
                existsOrError(user.email, 'Enter your E-mail!')
                existsOrError(user.birth, 'Enter your birth date!')
                equalsOrError(user.password, user.confirmPassword, 'Passwords do not match!')

                const userFromDb = await app.db('users')
                    .where({ email: user.email })
                    .first()

                if (!user.id) {
                    notExistsOrError(userFromDb, 'Already registered user!')
                }

            } catch (msg) {
                return res.status(400).send(msg)
            }
        } else {
            try {
                existsOrError(user.name, 'Enter your name!')
                existsOrError(user.email, 'Enter your E-mail!')
                existsOrError(user.birth, 'Enter your birth date!')
                existsOrError(user.password, 'Enter your password!')
                existsOrError(user.confirmPassword, 'Enter password confirmation!')
                equalsOrError(user.password, user.confirmPassword, 'Passwords do not match!')

                const userFromDb = await app.db('users')
                    .where({ email: user.email })
                    .first()

                if (!user.id) {
                    notExistsOrError(userFromDb, 'Already registered user!')
                }

            } catch (msg) {
                return res.status(400).send(msg)
            }
        }

        user.password = encryptPassword(user.password)
        delete user.confirmPassword

        if(user.id && req.body.password) {
            app.db('users')
                .update(user)
                .where({ id: user.id })
                .then(_ => res.status(204).send())
                .catch(err => res.status(500).send(err))

        } else if(user.id && !req.body.password) {
            app.db('users')
                .update({
                    name: user.name,
                    email: user.email,
                    birth: user.birth,
                    admin: user.admin
                })
                .where({ id: user.id })
                .then(_ => res.status(204).send())
                .catch(err => res.status(500).send(err))

        } else if(!user.id) {
            app.db('users')
                .insert(user)
                .then(_ => res.status(204).send())
                .catch(err => res.status(500).send(err))
        }
    }

    const limit = 10
    const get = async(req, res) => {
        const page = req.query.page || 1

        const result = await app.db('users').count('id').first()
        const count = parseInt(result.count)
        
        app.db('users')
            .select('id', 'name', 'email', 'birth', 'admin')
            .limit(limit).offset(page * limit - limit)
            .then(users => res.json({ data: users, count, limit }))
            .catch(err => res.status(500).send(err))
    }

    const getById = (req, res) => {
        app.db('users')
            .select('id', 'name', 'email', 'birth', 'admin')
            .where({ id: req.params.id })
            .first()
            .then(users => res.json(users))
            .catch(err => res.status(500).send(err))
    }

    const remove = async(req, res) => {
        try {
            const rowsDeleted = await app.db('users')
                .where({ id: req.params.id }).del()
            
            existsOrError(rowsDeleted, 'User not found')

            res.status(204).send()
        } catch(msg) {
            es.status(400).send(msg)
        }
    }

    return { save, get, getById, remove }
}