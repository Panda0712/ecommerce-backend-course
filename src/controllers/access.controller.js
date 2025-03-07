"use strict";

const { CREATED, SuccessResponse } = require("../core/success.response");
const AccessService = require("../services/access.service");

class AccessController {
  login = async (req, res, next) => {
    new SuccessResponse({
      metadata: await AccessService.login(req.body),
    }).send(res);
  };
  signUp = async (req, res, next) => {
    // return res.status(200).json({
    //   message: "",
    //   metadata: {},
    // });
    new CREATED({
      message: "Registered OK!",
      metadata: await AccessService.signUp(req.body),
      options: {
        limit: 10,
      },
    }).send(res);
  };
  logout = async (req, res, next) => {
    new SuccessResponse({
      message: "Logout Success!",
      metadata: await AccessService.logout(req.keyStore),
    }).send(res);
  };
  handleRefreshToken = async (req, res, next) => {
    // new SuccessResponse({
    //   message: "Get tokens Success!",
    //   metadata: await AccessService.handleRefreshToken(req.body.refreshToken),
    // }).send(res);

    // v2 fixed, no need accessToken
    new SuccessResponse({
      message: "Get tokens Success!",
      metadata: await AccessService.handleRefreshTokenV2({
        refreshToken: req.refreshToken,
        user: req.user,
        keyStore: req.keyStore,
      }),
    }).send(res);
  };
}

module.exports = new AccessController();
