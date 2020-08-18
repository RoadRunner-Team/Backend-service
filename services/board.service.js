const { Boards } = require('../models');

exports.getBoardListByType = async (type, limit = 10, offset = 0) => {
  try {
    const boards = await Boards.findAll({
      where: {
        type,
      },
      limit,
      offset,
      raw: true,
    });

    return { boards };
  } catch (e) {
    throw e;
  }
};
