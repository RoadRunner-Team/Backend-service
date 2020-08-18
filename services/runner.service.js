const {
  sequelize,
  Op,
  Users,
  RunnerOrders,
  ShopperOrders,
  ShopperOrderItems,
  ShopperOrderImages,
  ShopperOrderRequests,
  RunnerOrderRequests,
} = require('../models');

const { RUNNER_ORDER_REQUEST_STATUS } = require('../models/runnerOrderRequests');
const { SHOPPER_ORDER_REQUEST_STATUS } = require('../models/shopperOrderRequests');
const { SHOPPER_ORDER_STATUS } = require('../models/shopperOrders');

exports.getOrders = async ({ runnerId, offset = 0, limit = 20 }) => {
  try {
    const where = {};

    if (runnerId) where.runnerId = runnerId;

    const totalCount = await RunnerOrders.count({
      where,
    });

    const orders = await RunnerOrders.findAll({
      include: [
        {
          model: RunnerOrderRequests,
          as: 'runnerOrderRequests',
          include: [
            {
              model: Users,
              as: 'shopper',
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
        },
        {
          model: Users,
          as: 'runner',
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

exports.getRequests = async ({ runnerId, offset = 0, limit = 20, requestStatus }) => {
  try {
    const where = {};

    if (runnerId) where.runnerId = runnerId;
    if (requestStatus) where.requestStatus = requestStatus;
    else where.requestStatus = { [Op.not]: SHOPPER_ORDER_REQUEST_STATUS.MATCH_FAIL };

    const totalCount = await ShopperOrderRequests.count({
      where,
    });

    const orderRequests = await ShopperOrderRequests.findAll({
      include: [
        {
          model: ShopperOrders,
          as: 'shopperOrders',
          include: [
            {
              model: Users,
              as: 'shopper',
            },
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
    const order = await RunnerOrders.findOne({
      where: {
        orderId,
      },
      include: [
        {
          model: Users,
          as: 'runner',
        },
      ],
    });

    if (!order) throw new Error('RUNNER.ORDER_NOT_FOUND');

    const requests = await RunnerOrderRequests.findAll({
      where: {
        orderId,
      },
      include: [
        {
          model: Users,
          as: 'shopper',
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
    });

    return { order, requests };
  } catch (e) {
    throw e;
  }
};

exports.createOrder = async order => {
  try {
    const newOrder = await RunnerOrders.create({
      runnerId: order.runnerId,
      message: order.message,
      estimatedTime: order.estimatedTime,
      introduce: order.introduce,
      distance: order.distance,
      startContactableTime: order.startContactableTime,
      endContactableTime: order.endContactableTime,
      address: order.address,
      payments: order.payments,
    });

    return { order: newOrder };
  } catch (e) {
    throw e;
  }
};

exports.deleteOrder = async (runnerId, orderId) => {
  try {
    const deletedCount = await RunnerOrders.destroy({
      where: {
        runnerId,
        orderId,
      },
    });

    return deletedCount > 0;
  } catch (e) {
    throw e;
  }
};

exports.createOrderRequest = async shopperOrder => {
  const transaction = await sequelize.transaction();
  try {
    const newShopperOrder = await ShopperOrders.create(
      {
        title: shopperOrder.title,
        shopperId: shopperOrder.shopperId,
        priority: shopperOrder.priority,
        status: SHOPPER_ORDER_STATUS.REQUESTING,
        contents: shopperOrder.contents,
        startReceiveTime: shopperOrder.startReceiveTime,
        endReceiveTime: shopperOrder.endReceiveTime,
        receiveAddress: shopperOrder.receiveAddress,
        additionalMessage: shopperOrder.additionalMessage,
        estimatedPrice: shopperOrder.estimatedPrice,
        runnerTip: shopperOrder.runnerTip,
      },
      { transaction },
    );

    for (const item of shopperOrder.orderItems) {
      await ShopperOrderItems.create(
        {
          orderId: newShopperOrder.orderId,
          name: item.name,
          count: item.count,
          price: item.price,
        },
        { transaction },
      );
    }

    for (const image of shopperOrder.orderImages) {
      await ShopperOrderImages.create(
        {
          orderId: newShopperOrder.orderId,
          filename: image.filename,
          size: image.size,
          path: image.path,
        },
        { transaction },
      );
    }

    const request = await RunnerOrderRequests.create(
      {
        orderId: shopperOrder.orderId, // runnerOrderId
        shopperId: newShopperOrder.shopperId,
        shopperOrderId: newShopperOrder.orderId,
        requestStatus: RUNNER_ORDER_REQUEST_STATUS.REQUESTING,
      },
      { transaction },
    );

    await transaction.commit();
    return { request };
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
};

exports.getOrderRequests = async (orderId, { offset = 0, limit = 20 }) => {
  try {
    const totalCount = await RunnerOrderRequests.count({
      where: {
        orderId,
      },
    });

    const requests = await RunnerOrderRequests.findAll({
      include: [
        {
          model: Users,
          as: 'shopper',
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
    const request = await RunnerOrderRequests.findOne({
      include: [
        {
          model: Users,
          as: 'shopper',
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
      where: {
        requestId,
      },
    });

    if (!request) throw new Error('RUNNER.REQUEST_NOT_FOUND');

    return { request };
  } catch (e) {
    throw e;
  }
};

exports.updateOrderRequest = async request => {
  const transaction = await sequelize.transaction();

  // runnerOrderRequest의 status랑 shopperOrders의 status랑 거의같아서 통합하여 사용
  let prevStatus = null;
  switch (request.requestStatus) {
    case RUNNER_ORDER_REQUEST_STATUS.MATCHED:
    case RUNNER_ORDER_REQUEST_STATUS.MATCH_FAIL:
      prevStatus = RUNNER_ORDER_REQUEST_STATUS.REQUESTING;
      break;
    case RUNNER_ORDER_REQUEST_STATUS.DELIVERED_REQUEST:
      prevStatus = RUNNER_ORDER_REQUEST_STATUS.MATCHED;
      break;
    case RUNNER_ORDER_REQUEST_STATUS.DELIVERED:
      prevStatus = RUNNER_ORDER_REQUEST_STATUS.DELIVERED_REQUEST;
      break;
    case RUNNER_ORDER_REQUEST_STATUS.REVIEW_REQUEST:
      prevStatus = RUNNER_ORDER_REQUEST_STATUS.DELIVERED;
      break;
    case RUNNER_ORDER_REQUEST_STATUS.REVIEWED:
      prevStatus = RUNNER_ORDER_REQUEST_STATUS.REVIEW_REQUEST;
      break;
  }

  try {
    const orderRequest = await RunnerOrderRequests.findOne({
      where: {
        requestId: request.requestId,
      },
      transaction,
    });

    if (!orderRequest) throw new Error('RUNNER.REQUEST_NOT_FOUND');

    let [count] = await RunnerOrderRequests.update(
      {
        requestStatus: request.requestStatus,
      },
      {
        where: {
          requestId: request.requestId,
          requestStatus: prevStatus,
        },
        transaction,
      },
    );

    if (count === 0) throw new Error('RUNNER.INVALID_STATUS');

    [count] = await ShopperOrders.update(
      {
        status: request.requestStatus,
      },
      {
        where: {
          orderId: orderRequest.shopperOrderId,
          status: prevStatus,
        },
        transaction,
      },
    );

    if (count === 0) throw new Error('RUNNER.INVALID_STATUS');

    await transaction.commit();

    return true;
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
};

exports.deleteOrderRequest = async request => {
  const transaction = await sequelize.transaction();
  try {
    const orderRequest = await RunnerOrderRequests.findOne({
      where: {
        requestId: request.requestId,
      },
      transaction,
    });

    if (!orderRequest) throw new Error('RUNNER.REQUEST_NOT_FOUND');

    const deletedCount = await RunnerOrderRequests.destroy({
      where: {
        requestId: request.requestId,
      },
      transaction,
    });

    await ShopperOrders.destroy({
      where: {
        orderId: orderRequest.shopperOrderId,
      },
      transaction,
    });

    await ShopperOrderItems.destroy({
      where: {
        orderId: orderRequest.shopperOrderId,
      },
      transaction,
    });

    await ShopperOrderImages.destroy({
      where: {
        orderId: orderRequest.shopperOrderId,
      },
      transaction,
    });

    await transaction.commit();
    return deletedCount > 0;
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
};
