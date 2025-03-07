"use strict";

const shopModel = require("../models/shop.model");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const KeyTokenService = require("./keyToken.service");
const { createTokenPair, verifyJWT } = require("../auth/authUtils");
const { getInfoData } = require("../utils");
const {
  BadRequestError,
  AuthFailureError,
  ForbiddenError,
} = require("../core/error.response");
const { findByEmailService } = require("./shop.service");

const ShopRole = {
  SHOP: "SHOP",
  WRITER: "WRITER",
  EDITOR: "EDITOR",
  ADMIN: "ADMIN",
};

class AccessService {
  static handleRefreshTokenV2 = async ({ refreshToken, user, keyStore }) => {
    const { userId, email } = user;

    if (keyStore.refreshTokensUsed.includes(refreshToken)) {
      await KeyTokenService.deleteKeyById(userId);
      throw new ForbiddenError("Something wrong happened!! Please login again");
    }

    if (keyStore.refreshToken !== refreshToken)
      throw new AuthFailureError("Shop not registered");

    const foundShop = await findByEmailService({ email });
    if (!foundShop) throw new AuthFailureError("Shop not registered");

    // create new token pair
    const tokens = await createTokenPair(
      { userId, email },
      keyStore.publicKey,
      keyStore.privateKey
    );

    // update token
    await keyStore.updateOne({
      $set: {
        refreshToken: tokens.refreshToken,
      },
      $addToSet: {
        refreshTokensUsed: refreshToken,
      },
    });

    return {
      user,
      tokens,
    };
  };

  static handleRefreshToken = async (refreshToken) => {
    // check token existence
    const foundToken = await KeyTokenService.findByRefreshTokenUsed(
      refreshToken
    );
    if (foundToken) {
      // decode xem may la thang nao?
      const { userId, email } = await verifyJWT(
        refreshToken,
        foundToken.privateKey
      );
      console.log({ userId, email });
      // delete tokens in the store
      await KeyTokenService.deleteKeyById(userId);
      throw new ForbiddenError("Something wrong happened!! Please login again");
    }

    // No, pass
    const holderToken = await KeyTokenService.findByRefreshToken(refreshToken);
    if (!holderToken) throw new AuthFailureError("Shop not registered");

    // verify token
    const { userId, email } = await verifyJWT(
      refreshToken,
      holderToken.privateKey
    );
    console.log("[2]---", { userId, email });
    // check userId
    const foundShop = await findByEmailService({ email });
    if (!foundShop) throw new AuthFailureError("Shop not registered");

    // create new token pair
    const tokens = await createTokenPair(
      { userId, email },
      holderToken.privateKey,
      holderToken.privateKey
    );

    // update token
    await holderToken.updateOne({
      $set: {
        refreshToken: tokens.refreshToken,
      },
      $addToSet: {
        refreshTokensUsed: refreshToken,
      },
    });

    return {
      user: { userId, email },
      tokens,
    };
  };

  static logout = async (keyStore) => {
    const delKey = await KeyTokenService.removeToken({ id: keyStore._id });
    console.log(delKey);
    return delKey;
  };

  static login = async ({ email, password, refreshToken = null }) => {
    // 1. check email in db
    const shopFind = await findByEmailService({ email });
    if (!shopFind) {
      throw new BadRequestError("Error: Shop not registered");
    }
    // 2. check password
    const matchPassword = bcrypt.compare(password, shopFind.password);
    if (!matchPassword) {
      throw new AuthFailureError("Error: Authentication Error");
    }
    // 3. create accessToken and refreshToken and save
    const privateKey = crypto.randomBytes(64).toString("hex");
    const publicKey = crypto.randomBytes(64).toString("hex");
    // 4. generate tokens
    const tokens = await createTokenPair(
      { userId: shopFind._id, email },
      publicKey,
      privateKey
    );
    await KeyTokenService.createKeyToken({
      userId: shopFind._id,
      publicKey,
      privateKey,
      refreshToken: tokens.refreshToken,
    });
    // 5. get data and return login
    return {
      shop: getInfoData({
        fields: ["_id", "name", "email"],
        object: shopFind,
      }),
      tokens,
    };
  };

  static signUp = async ({ name, email, password }) => {
    try {
      // step 1: check email existence
      const holderShop = await shopModel.findOne({ email }).lean();
      if (holderShop) {
        throw new BadRequestError("Error: Shop already registered");
      }

      // step 2: create new shop
      const hashedPassword = await bcrypt.hash(password, 10);
      const newShop = await shopModel.create({
        name,
        email,
        password: hashedPassword,
        roles: [ShopRole.SHOP],
      });

      if (newShop) {
        // create privateKey, publicKey
        // const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
        //   modulusLength: 4096,
        //   publicKeyEncoding: {
        //     type: "pkcs1",
        //     format: "pem",
        //   },
        //   privateKeyEncoding: {
        //     type: "pkcs1",
        //     format: "pem",
        //   },
        // });
        const refreshToken = crypto.randomBytes(64).toString("hex");
        const accessToken = crypto.randomBytes(64).toString("hex");

        console.log({ refreshToken, accessToken }); // save collection keystore

        const keyStore = await KeyTokenService.createKeyToken({
          userId: newShop._id,
          publicKey: accessToken,
          privateKey: refreshToken,
        });

        if (!keyStore) {
          return {
            code: "xxxx",
            message: "keyStore error",
          };
        }

        // const publicKeyObject = crypto.createPublicKey(publicKeyString);

        // create token pair
        const tokens = await createTokenPair(
          { userId: newShop._id, email },
          accessToken,
          refreshToken
        );
        console.log("Created Token Success::", tokens);

        return {
          code: 201,
          metadata: {
            shop: getInfoData({
              fields: ["_id", "email", "name"],
              object: newShop,
            }),
            tokens,
          },
        };
      }

      return {
        code: "200",
        metadata: null,
      };
    } catch (err) {
      return {
        code: "xxx",
        message: err.message,
        status: "error",
      };
    }
  };
}

module.exports = AccessService;
