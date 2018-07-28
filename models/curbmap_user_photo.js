"use strict";
module.exports = (sequelize, DataTypes) => {
  var curbmap_user_photo = sequelize.define(
    "curbmap_user_photo",
    {
      photos: {
        type: DataTypes.ARRAY({ type: DataTypes.JSONB }),
        defaultValue: []
      },
      userid: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "curbmap_users",
          key: "id"
        },
        onUpdate: "cascade",
        onDelete: "cascade"
      }
    },
    {}
  );
  curbmap_user_photo.associate = function(models) {
    // associations can be defined here
  };
  return curbmap_user_photo;
};
