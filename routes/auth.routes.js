const Routes = require('express');
const mysqls = require('../modules/mysql')
const { check, validationResult } = require('express-validator')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const config = require('config')
const authMidleware = require('./auth.midleware')
const router = new Routes();

router.post('/registration',
    [
        check('email', 'Некорректный email.').isEmail(),
        check('password', 'Длина пароля должна быть не менее 6 символов.').isLength({ min: 6, max: 15 })
    ], async (req, res) => {
        try {
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                return (res.status(400).json({ message: 'Uncorrect request', errors }))
            }
            const { email, password, name, second_name } = req.body
            const hashPass = await bcrypt.hash(password, 5);
            mysqls.executeQuery(`SELECT * FROM clients WHERE email = '${email}' LIMIT 1`, function (err, rows, fields) {
                if (err) {
                    console.log('[DATABASE | ERROR] ' + err);
                    return;
                }

                if (rows.length === 0) {
                    let sql = `INSERT INTO clients (email, name, second_name, password) VALUES ('${email}', '${name}', '${second_name}', '${hashPass}')`;
                    mysqls.executeQuery(sql)
                    res.send("Вы успешно зарегестрировались.")
                } else if (rows[0].email === email) {
                    res.status(400).json({ message: "Данный email: " + email + " занят." })
                }
            });
        } catch (e) {
            console.log(e);
            res.send({ message: "server error" })
        }
    })


router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        mysqls.executeQuery(`SELECT * FROM clients WHERE email = '${email}' LIMIT 1`, function (err, rows, fields) {
            if (err) {
                console.log('[DATABASE | ERROR] ' + err);
                return;
            }

            if (rows.length === 0) {
                return res.status(400).json({ message: "Пользователь не найден." })
            }

            if (!bcrypt.compareSync(password, rows[0].password)) {
                return res.status(400).json({ message: "Неправильный пароль или логин." })
            }

            const token = jwt.sign({ id: rows[0].client_id }, config.get("secret_key"), { expiresIn: "1h" })
            return res.json({
                token,
                user: {
                    id: rows[0].client_id,
                    email: rows[0].email
                }
            })
        });
    } catch (e) {
        console.log(e);
        res.send({ message: "server error" })
    }
})

router.get('/auth', authMidleware ,async (req, res) => {
    try {
        mysqls.executeQuery(`SELECT * FROM clients WHERE client_id = '${req.user.id}' LIMIT 1`, function (err, rows, fields) {
            if (err) {
                console.log('[DATABASE | ERROR] ' + err);
                return;
            }
            if (rows.length === 0) {
                return res.status(400).json({ message: "Пользователь не найден." })
            }
            const token = jwt.sign({ id: rows[0].client_id }, config.get("secret_key"), { expiresIn: "1h" })
            return res.json({
                token,
                user: {
                    id: rows[0].client_id,
                    email: rows[0].email
                }
            })
        });
    } catch (e) {
        console.log(e);
        res.send({ message: "server error" })
    }
})

router.post('/get_products', async (req, res) => {
    try {
        mysqls.executeQuery(`SELECT * FROM products`, function (err, rows, fields) {

            if (err) {
                console.log('[DATABASE | ERROR] ' + err);
                return;
            }

            if (rows.length === 0) {
                return res.status(400).json({ message: "Пользователь не найден." })
            }

            return res.json({
                products: rows
            })
        });
    } catch (e) {
        console.log(e);
        res.send({ message: "server error" })
    }
})

router.post('/get_product', async (req, res) => {
    try {

        mysqls.executeQuery(`SELECT * FROM products WHERE products_id = '${req.body.product_id}' LIMIT 1`, function (err, rows, fields) {

            if (err) {
                console.log('[DATABASE | ERROR] ' + err);
                return;
            }

            if (rows.length === 0) {
                return res.status(400).json({ message: "Пользователь не найден." })
            }

            return res.json({
                product: {
                    name: rows[0].name,
                    price: rows[0].price
                }
            })
        });
    } catch (e) {
        console.log(e);
        res.send({ message: "server error" })
    }
})


module.exports = router;