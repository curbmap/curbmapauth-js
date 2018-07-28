"use strict";
module.exports = (sequelize, DataTypes) => {
  var curbmap_user_restrictions = sequelize.define(
    "curbmap_user_restrictions",
    {
      userid: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "curbmap_users",
          key: "id"
        },
        onUpdate: "cascade",
        onDelete: "cascade"
      },
      line_id: DataTypes.STRING,
      restriction_id: DataTypes.STRING
    },
    {}
  );
  curbmap_user_restrictions.associate = function(models) {
    // associations can be defined here
  };
  return curbmap_user_restrictions;
};
