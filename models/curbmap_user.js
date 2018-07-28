"use strict";
module.exports = (sequelize, DataTypes) => {
  var curbmap_user = sequelize.define(
    "curbmap_users",
    {
      username: { type: DataTypes.STRING, primaryKey: true },
      active_account: { type: DataTypes.BOOLEAN, defaultValue: true },
      authorized: { type: DataTypes.BOOLEAN, defaultValue: false },
      external_auth_key: DataTypes.STRING,
      external_auth_service: DataTypes.STRING,
      role: { type: DataTypes.STRING, defaultValue: "ROLE_USER" },
      external_auth_id: DataTypes.STRING,
      auth_token: DataTypes.STRING,
      password: DataTypes.STRING,
      email: { type: DataTypes.STRING, unique: true },
      score: { type: DataTypes.INTEGER, defaultValue: 0 },
      badge: {
        type: DataTypes.ARRAY({ type: DataTypes.INTEGER }),
        defaultValue: [1]
      },
      badge_updated: { type: DataTypes.DATE, defaultValue: new Date() }
    },
    {}
  );
  curbmap_user.associate = function(models) {
    // associations can be defined here
  };
  return curbmap_user;
};
