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

router.post('/get_reviews', async (req, res) => {
    try {

        mysqls.executeQuery(`SELECT reviews.*, clients.client_id, clients.name, clients.second_name
         FROM reviews, clients WHERE reviews.product_id = '${req.body.product_id}' AND reviews.client_id = clients.client_id`, function (err, rows, fields) {

            if (err) {
                console.log('[DATABASE | ERROR] ' + err);
                return;
            }

            if (rows.length === 0) {
                return res.status(400).json({ message: "Пользователь не найден." })
            }
            let arr = [];
            rows.forEach(element => {
                arr.push({
                    rating: element.rating,
                    message: element.message,
                    name: element.name,
                    second_name: element.second_name
                })
            });
            return res.json({
                reviews: arr
            })
        });

    } catch (e) {
        console.log(e);
        res.send({ message: "server error" })
    }
})

router.post('/add_review', async (req, res) => {
    try {
        const {client_id, product_id, message, rating} = req.body
        let ratingInt = parseInt(rating, 10);

        if(rating.length == 1 && ratingInt >= 1 && ratingInt <=5){
            mysqls.executeQuery(`INSERT INTO reviews (client_id, product_id, message, rating) VALUES ('${client_id}', '${product_id}', '${message}', '${rating}')`);
            res.send("Отзыв успешно добавлен")
        }else{
            res.send("Введите целое число от 1 до 5!!!")
        }
    } catch (e) {
        console.log(e);
        res.send({ message: "server error" })
    }
})

router.post('/get_categories', async (req, res) => {
    try {

        mysqls.executeQuery(`SELECT * FROM categories`, function (err, rows, fields) {

            if (err) {
                console.log('[DATABASE | ERROR] ' + err);
                return;
            }

            if (rows.length === 0) {
                return res.status(400).json({ message: "Пользователь не найден." })
            }
            return res.json({
                categories: rows
            })
        });

    } catch (e) {
        console.log(e);
        res.send({ message: "server error" })
    }
})

router.post('/get_product_categories', async (req, res) => {
    try {

        mysqls.executeQuery(`SELECT category_name FROM products_categories WHERE products_id = '${req.body.product_id}'`, function (err, rows, fields) {

            if (err) {
                console.log('[DATABASE | ERROR] ' + err);
                return;
            }

            if (rows.length === 0) {
                return res.status(400).json({ message: "Пользователь не найден." })
            }
            return res.json({
                product_categories: rows
            })
        });

    } catch (e) {
        console.log(e);
        res.send({ message: "server error" })
    }
})

router.post('/get_category_products', async (req, res) => {
    try {

        mysqls.executeQuery(`SELECT products_categories.*, products.products_id, products.name, products.price
        FROM products_categories, products WHERE products_categories.category_name = '${req.body.category_name}' 
        AND products_categories.products_id = products.products_id`, function (err, rows, fields) {

            if (err) {
                console.log('[DATABASE | ERROR] ' + err);
                return;
            }

            if (rows.length === 0) {
                return res.status(400).json({ message: "Пользователь не найден." })
            }
            let arr = [];
            rows.forEach(element => {
                arr.push({
                    products_id: element.products_id,
                    name: element.name,
                    price: element.price
                })
            });
            return res.json({
                category_products: arr
            })
        });

    } catch (e) {
        console.log(e);
        res.send({ message: "server error" })
    }
})

router.post('/get_client', async (req, res) => {
    try {
        const decoded = jwt.verify(req.body.token, config.get('secret_key'));
        mysqls.executeQuery(`SELECT * FROM clients WHERE client_id = ${decoded.id} LIMIT 1`, function (err, rows, fields) {

            if (err) {
                console.log('[DATABASE | ERROR] ' + err);
                return;
            }

            if (rows.length === 0) {
                return res.status(400).json({ message: "Пользователь не найден." })
            }
            return res.json({
                client: {
                    name: rows[0].name,
                    second_name: rows[0].second_name,
                    third_name: rows[0].third_name,
                    email: rows[0].email,
                    client_address: rows[0].client_address,
                    phone_number: rows[0].phone_number
                }
            })
        });
    } catch (e) {
        console.log(e);
        res.send({ message: "server error" })
    }
})

router.post('/update_client', async (req, res) => {
    try {
        const decoded = jwt.verify(req.body.token, config.get('secret_key'));
        mysqls.executeQuery(`UPDATE clients 
        SET name = '${req.body.name}', second_name = '${req.body.second_name}', third_name = '${req.body.third_name}', client_address = '${req.body.client_address}', phone_number = '${req.body.phone_number}'
        WHERE client_id = ${decoded.id} `, function (err, rows, fields) {

            if (err) {
                console.log('[DATABASE | ERROR] ' + err);
                return;
            }

            if (rows.length === 0) {
                return res.status(400).json({ message: "Пользователь не найден." })
            }
            return res.json({
            })
        });
    } catch (e) {
        console.log(e);
        res.send({ message: "server error" })
    }
})

module.exports = router;