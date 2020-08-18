const { Op, sequelize, Users, ChattingRooms, ChattingMessages } = require('../models');
const { CHATTING_MESSAGE_TYPE } = require('../models/chattingMessages');

exports.getRoomByRoomKey = async (roomKey, userId) => {
  try {
    const chattingRoom = await ChattingRooms.findOne({
      where: { roomKey },
      include: [
        {
          model: Users,
          where: { userId },
          attributes: [],
        },
      ],
    });
    return chattingRoom;
  } catch (e) {
    throw e;
  }
};

exports.createRoom = async userIds => {
  const transaction = await sequelize.transaction();

  try {
    const chattingRoom = await ChattingRooms.create(
      {
        roomKey: userIds.join('-'),
      },
      { transaction },
    );

    userIds.map(async userId => {
      await chattingRoom.addUsers(userId);
    });

    await transaction.commit();

    return chattingRoom;
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
};

exports.loadMessage = async (roomId, limit, offset) => {
  try {
    const chattingMessage = await ChattingMessages.findAll({
      where: { roomId },
      limit,
      offset,
      raw: true,
      order: [['createdAt', 'desc']],
    });

    return chattingMessage;
  } catch (e) {
    throw e;
  }
};

exports.loadRoom = async (userId, limit, offset) => {
  try {
    const data = await ChattingRooms.findAll({
      where: {},
      include: [
        {
          model: Users,
          where: { userId },
          attributes: [],
        },
      ],
      attributes: ['roomId'],
      limit,
      offset,
    });

    const roomIds = data.map(v => v.roomId);

    const chattingRooms = await ChattingRooms.findAll({
      where: {
        roomId: { [Op.in]: roomIds },
      },
      include: [
        {
          model: Users,
          attributes: {
            exclude: ['password', 'deletedAt'],
          },
          through: {
            attributes: [],
          },
        },
      ],
      limit,
      offset,
    });

    // console.log(chattingRooms);

    return chattingRooms;
  } catch (e) {
    throw e;
  }
};

exports.createMessage = async (
  userId,
  message,
  roomId,
  type = CHATTING_MESSAGE_TYPE.DIRECT_CHAT,
) => {
  const transaction = await sequelize.transaction();

  try {
    const chattingMessage = await ChattingMessages.create(
      {
        userId,
        roomId,
        message,
        type,
      },
      { transaction },
    );

    await transaction.commit();

    return chattingMessage;
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
};
