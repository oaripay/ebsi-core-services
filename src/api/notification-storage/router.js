const express = require("express");
const bodyParser = require("body-parser");

const controller = require("./controller");
const { BadRequestError } = require("../../errors");

const router = express.Router();

router.use(bodyParser.json({ type: "*/*" }));
router.use((error, req, res, next) => {
  next(
    new BadRequestError(BadRequestError.defaultTitle, {
      detail: "The body can not be parsed as application/json",
    })
  );
});

// List of notifications
router.get("/", async (req, res, next) => {
  try {
    const result = await controller.getListNotifications(req.query);
    res.send(result);
  } catch (error) {
    next(error);
  }
});

// Add a notification
router.put("/", async (req, res, next) => {
  try {
    const value = req.body;
    const result = await controller.addNotification(value);
    res.send(result);
  } catch (error) {
    next(error);
  }
});

// Update a notification
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const value = req.body;
    const result = await controller.updateNotification(id, value);
    res.status(201).send(result);
  } catch (error) {
    next(error);
  }
});

// Get notification by id
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await controller.getNotification(id);
    res.send(result);
  } catch (error) {
    next(error);
  }
});

// Delete notification by id
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    await controller.deleteNotification(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
