const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserService = require('../services/user.service');

exports.join = async user => {
  try {
    const exUser = await UserService.getUserByEmail(user.email);
    if (exUser) throw new Error('AUTH.REGISTERED_USER');

    const hashPassword = await bcrypt.hash(user.password, 12);
    const createdUser = await UserService.createUser({ ...user, password: hashPassword });

    return { user: createdUser };
  } catch (e) {
    throw e;
  }
};

exports.login = async user => {
  try {
    const checkUser = await UserService.getUserByEmailWithPassword(user.email);
    if (!checkUser) throw new Error('AUTH.NOT_REGISTERED_USER');

    const checkPassword = await bcrypt.compare(user.password, checkUser.password);
    if (!checkPassword) throw new Error('AUTH.PASSWORD_INCORRECT');

    const plainUser = checkUser.toJSON();
    delete plainUser.password;

    const token = jwt.sign(plainUser, process.env.JWT_SECRET, { expiresIn: '30d' });

    return { user: plainUser, token };
  } catch (e) {
    throw e;
  }
};
