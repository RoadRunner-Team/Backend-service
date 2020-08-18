const { Op, Users } = require('../models');
const { randomString } = require('../util/util');

exports.getUserById = async userId => {
  try {
    const user = await Users.findOne({
      where: { userId },
    });
    return user;
  } catch (e) {
    throw e;
  }
};

exports.updateUser = async user => {
  try {
    await Users.update(
      {
        displayName: user.displayName,
        address: user.address,
        addressDetail: user.addressDetail,
        gender: user.gender,
        profileImagePath: user.profileImagePath,
        possibleDistance: user.possibleDistance,
        contactTime: user.contactTime,
        payments: user.payments,
      },
      {
        where: { userId: user.userId },
      },
    );

    return true;
  } catch (e) {
    throw e;
  }
};

exports.getUserByEmail = async email => {
  try {
    const user = await Users.findOne({
      where: { email },
    });
    return user;
  } catch (e) {
    throw e;
  }
};

exports.getUserByIdWithPassword = async userId => {
  try {
    const user = await Users.findOne({
      where: { userId },
      attributes: {
        include: ['password'],
      },
    });
    return user;
  } catch (e) {
    throw e;
  }
};

exports.updateUserPassword = async (userId, password) => {
  try {
    await Users.update(
      {
        password,
      },
      {
        where: { userId },
      },
    );

    return true;
  } catch (e) {
    throw e;
  }
};

exports.getUserByEmailWithPassword = async email => {
  try {
    const user = await Users.findOne({
      where: { email },
      attributes: {
        include: ['password'],
      },
    });
    return user;
  } catch (e) {
    throw e;
  }
};

exports.createUser = async user => {
  try {
    await Users.create(user);
    const createdUser = await this.getUserByEmail(user.email);
    return createdUser;
  } catch (e) {
    throw e;
  }
};

exports.getUserByIds = async userIds => {
  try {
    const users = await Users.findAll({
      where: { userId: { [Op.in]: userIds } },
    });
    return users;
  } catch (e) {
    throw e;
  }
};

exports.getUserCountByIds = async userIds => {
  try {
    const count = await Users.count({
      where: { userId: { [Op.in]: userIds } },
      attributes: {
        exclude: ['password', 'deletedAt'],
      },
    });

    return { count, isSame: userIds.length === count };
  } catch (e) {
    throw e;
  }
};

exports.deleteUserById = async userId => {
  try {
    const user = await Users.findOne({ where: { userId } });
    await Users.update(
      { email: user.email + '_@' + randomString(), deletedAt: new Date() },
      { where: { userId } },
    );
    return true;
  } catch (e) {
    throw e;
  }
};
