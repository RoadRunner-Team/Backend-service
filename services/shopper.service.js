const {
  Op,
  sequelize,
  Users,
  RunnerOrders,
  RunnerOrderRequests,
  ShopperOrders,
  ShopperOrderItems,
  ShopperOrderImages,
  ShopperOrderRequests,
} = require('../models');

const { SHOPPER_ORDER_STATUS } = require('../models/shopperOrders');
const { SHOPPER_ORDER_REQUEST_STATUS } = require('../models/shopperOrderRequests');

exports.getOrders = async ({ shopperId, offset = 0, limit = 20 }) => {
  try {
    const where = {
      status: {
        [Op.not]: SHOPPER_ORDER_REQUEST_STATUS.REQUESTING,
      },
    };

    if (shopperId) where.shopperId = shopperId;

    const totalCount = await ShopperOrders.count({
      where,
    });

    const orders = await ShopperOrders.findAll({
      include: [
        {
          model: ShopperOrderRequests,
          as: 'shopperOrderRequests',
          required: false,
          include: [
            {
              model: Users,
              as: 'runner',
            },
          ],
          where: {
            requestStatus: {
              [Op.not]: SHOPPER_ORDER_REQUEST_STATUS.MATCH_FAIL,
            },
          },
        },
        {
          model: ShopperOrderItems,
          as: 'shopperOrderItems',
        },
        {
          model: ShopperOrderImages,
          as: 'shopperOrderImages',
        },
        {
          model: Users,
          as: 'shopper',
        },
      ],
      where,
      order: [['updatedAt', 'DESC']],
      offset,
      limit,
    });

    return { totalCount, orders };
  } catch (e) {
    throw e;
  }
};

exports.getRequests = async ({ shopperId, offset = 0, limit = 20, requestStatus }) => {
  try {
    const where = {};

    if (shopperId) where.shopperId = shopperId;
    if (requestStatus) where.requestStatus = requestStatus;
    else where.requestStatus = { [Op.not]: SHOPPER_ORDER_REQUEST_STATUS.MATCH_FAIL };

    const totalCount = await RunnerOrderRequests.count({
      where,
    });

    const orderRequests = await RunnerOrderRequests.findAll({
      include: [
        {
          model: RunnerOrders,
          as: 'runnerOrders',
          include: [
            {
              model: Users,
              as: 'runner',
            },
          ],
        },
        {
          model: ShopperOrders,
          as: 'shopperOrders',
          include: [
            {
              model: ShopperOrderItems,
              as: 'shopperOrderItems',
            },
            {
              model: ShopperOrderImages,
              as: 'shopperOrderImages',
            },
          ],
        },
      ],
      where,
      offset,
      limit,
    });

    return { totalCount, orderRequests };
  } catch (e) {
    throw e;
  }
};

exports.getOrderById = async orderId => {
  try {
    const order = await ShopperOrders.findOne({
      where: {
        orderId,
      },
      include: [
        {
          model: ShopperOrderItems,
          as: 'shopperOrderItems',
        },
        {
          model: ShopperOrderImages,
          as: 'shopperOrderImages',
        },
        {
          model: Users,
          as: 'shopper',
        },
      ],
    });

    if (!order) throw new Error('SHOPPER.ORDER_NOT_FOUND');

    const shopperOrderRequests = await ShopperOrderRequests.findAll({
      where: {
        orderId,
        requestStatus: {
          [Op.not]: SHOPPER_ORDER_REQUEST_STATUS.MATCH_FAIL,
        },
      },
      include: [
        {
          model: Users,
          as: 'runner',
        },
      ],
    });

    return { order, shopperOrderRequests };
  } catch (e) {
    throw e;
  }
};

exports.createOrder = async order => {
  const transaction = await sequelize.transaction();
  try {
    const newOrder = await ShopperOrders.create(
      {
        title: order.title,
        shopperId: order.shopperId,
        priority: order.priority,
        status: SHOPPER_ORDER_STATUS.MATCHING,
        contents: order.contents,
        startReceiveTime: order.startReceiveTime,
        endReceiveTime: order.endReceiveTime,
        receiveAddress: order.receiveAddress,
        additionalMessage: order.additionalMessage,
        estimatedPrice: order.estimatedPrice,
        runnerTip: order.runnerTip,
      },
      { transaction },
    );

    for (const item of order.orderItems) {
      await ShopperOrderItems.create(
        {
          orderId: newOrder.orderId,
          name: item.name,
          count: item.count,
          price: item.price,
        },
        { transaction },
      );
    }

    for (const image of order.orderImages) {
      await ShopperOrderImages.create(
        {
          orderId: newOrder.orderId,
          filename: image.filename,
          size: image.size,
          path: image.path,
        },
        { transaction },
      );
    }

    await transaction.commit();

    const newOrder_ = await ShopperOrders.findOne({
      where: {
        orderId: newOrder.orderId,
      },
      include: [
        {
          model: ShopperOrderItems,
          as: 'shopperOrderItems',
        },
        {
          model: ShopperOrderImages,
          as: 'shopperOrderImages',
        },
      ],
    });

    return { order: newOrder_ };
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
};

exports.deleteOrder = async (shopperId, orderId) => {
  try {
    const deletedCount = await ShopperOrders.destroy({
      where: {
        shopperId,
        orderId,
      },
    });

    return deletedCount > 0;
  } catch (e) {
    throw e;
  }
};

exports.createOrderRequest = async (orderId, runnerId) => {
  try {
    const request = await ShopperOrderRequests.create({
      orderId,
      runnerId,
      requestStatus: SHOPPER_ORDER_STATUS.REQUESTING,
    });

    return { request };
  } catch (e) {
    throw e;
  }
};

exports.getOrderRequests = async (orderId, { offset = 0, limit = 20 }) => {
  try {
    const totalCount = await ShopperOrderRequests.count({
      where: {
        orderId,
      },
    });

    const requests = await ShopperOrderRequests.findAll({
      include: [
        {
          model: Users,
          as: 'runner',
        },
      ],
      where: {
        orderId,
      },
      offset,
      limit,
    });

    return { totalCount, requests };
  } catch (e) {
    throw e;
  }
};

exports.getOrderRequestById = async requestId => {
  try {
    const request = await ShopperOrderRequests.findOne({
      include: [
        {
          model: Users,
          as: 'runner',
        },
      ],
      where: {
        requestId,
      },
    });

    if (!request) throw new Error('SHOPPER.REQUEST_NOT_FOUND');

    return { request };
  } catch (e) {
    throw e;
  }
};

exports.updateOrderRequest = async request => {
  const transaction = await sequelize.transaction();

  let prevRequestStatus = null;
  let prevOrderStatus = null;
  switch (request.requestStatus) {
    case SHOPPER_ORDER_STATUS.MATCHED:
    case SHOPPER_ORDER_STATUS.MATCH_FAIL:
      prevRequestStatus = SHOPPER_ORDER_STATUS.REQUESTING;
      break;
    case SHOPPER_ORDER_STATUS.DELIVERED_REQUEST:
      prevRequestStatus = SHOPPER_ORDER_STATUS.MATCHED;
      break;
    case SHOPPER_ORDER_STATUS.DELIVERED:
      prevRequestStatus = SHOPPER_ORDER_STATUS.DELIVERED_REQUEST;
      break;
    case SHOPPER_ORDER_STATUS.REVIEW_REQUEST:
      prevRequestStatus = SHOPPER_ORDER_STATUS.DELIVERED;
      break;
    case SHOPPER_ORDER_STATUS.REVIEWED:
      prevRequestStatus = SHOPPER_ORDER_STATUS.REVIEW_REQUEST;
      break;
  }

  if (prevRequestStatus === SHOPPER_ORDER_STATUS.REQUESTING)
    prevOrderStatus = SHOPPER_ORDER_STATUS.MATCHING;
  else prevOrderStatus = prevRequestStatus;

  try {
    let [count] = await ShopperOrderRequests.update(
      {
        requestStatus: request.requestStatus,
      },
      {
        where: {
          requestId: request.requestId,
          requestStatus: prevRequestStatus,
        },
        transaction,
      },
    );

    if (count === 0) throw new Error('SHOPPER.INVALID_STATUS');

    const orderRequest = await ShopperOrderRequests.findOne({
      where: {
        requestId: request.requestId,
      },
      transaction,
    });

    [count] = await ShopperOrders.update(
      {
        status: request.requestStatus,
      },
      {
        where: {
          orderId: orderRequest.orderId,
          status: prevOrderStatus,
        },
        transaction,
      },
    );

    if (count === 0) throw new Error('SHOPPER.INVALID_STATUS');

    // shopper가 특정 runner의 요청을 받아들였을 경우, 그 외 나머지 runner의 요청은 매칭 실패로 처리함
    if (request.requestStatus === SHOPPER_ORDER_STATUS.MATCHED) {
      await ShopperOrderRequests.update(
        {
          requestStatus: SHOPPER_ORDER_STATUS.MATCH_FAIL,
        },
        {
          where: {
            orderId: orderRequest.orderId,
            requestId: {
              [Op.ne]: orderRequest.requestId,
            },
          },
          transaction,
        },
      );
    }

    await transaction.commit();
    return true;
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
};

exports.deleteOrderRequest = async request => {
  try {
    const deletedCount = await ShopperOrderRequests.destroy({
      where: {
        requestId: request.requestId,
      },
    });

    return deletedCount > 0;
  } catch (e) {
    throw e;
  }
};
