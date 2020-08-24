const express = require("express");

const controller = require("./controller");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const result = await controller.getChannels(req.query);
    res.send(result);
  } catch (error) {
    next(error);
  }
});

router.get("/:channel", async (req, res, next) => {
  try {
    const { channel } = req.params;
    await controller.getChannel(channel);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/:channel/blocks", async (req, res, next) => {
  try {
    const { channel } = req.params;
    const result = await controller.getBlocks(channel, req.query);
    res.send(result);
  } catch (error) {
    next(error);
  }
});

router.get("/:channel/blocks/:blockNumber", async (req, res, next) => {
  try {
    const { channel, blockNumber } = req.params;
    const result = await controller.getBlock(channel, blockNumber);
    res.send(result);
  } catch (error) {
    next(error);
  }
});

router.get("/:channel/transactions", async (req, res, next) => {
  try {
    const { channel } = req.params;
    const result = await controller.getTransactions(channel, req.query);
    res.send(result);
  } catch (error) {
    next(error);
  }
});

router.get("/:channel/transactions/:transactionId", async (req, res, next) => {
  try {
    const { channel, transactionId } = req.params;
    const result = await controller.getTransaction(channel, transactionId);
    res.send(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
