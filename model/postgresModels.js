const Sequelize = require("sequelize");
const uri =
  "postgres://" +
  process.env.USERDB_USERNAME +
  ":" +
  process.env.USERDB_PASSWORD +
  "@" +
  process.env.POSTGRES_HOST +
  "/" +
  process.env.POSTGRES_DB;
const sequelize = new Sequelize(uri);

const User = sequelize.define(
  "standard_user",
  {
    id_user: {
      type: Sequelize.STRING,
      primaryKey: true
    },
    active_account: {
      type: Sequelize.INTEGER,
      defaultValue: 1
    },
    auth_token: {
      type: Sequelize.STRING
    },
    authorized: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    date_created: {
      type: Sequelize.DATE,
      defaultValue: new Date()
    },
    external_auth_key: {
      type: Sequelize.STRING
    },
    external_auth_service: {
      type: Sequelize.STRING
    },
    password_hash: {
      type: Sequelize.STRING
    },
    role: {
      type: Sequelize.STRING,
      defaultValue: "ROLE_USER"
    },
    user_email: {
      type: Sequelize.STRING
    },
    username: {
      type: Sequelize.STRING
    },
    external_auth_id: {
      type: Sequelize.STRING
    },
    createdAt: {
      type: Sequelize.DATE,
      defaultValue: new Date()
    },
    updatedAt: {
      type: Sequelize.DATE,
      defaultValue: new Date()
    },
    score: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    score_updatedAt: {
      type: Sequelize.DATE,
      defaultValue: new Date()
    },
    badge: {
      type: Sequelize.STRING,
      defaultValue: "beginner"
    },
    badge_updatedAt: {
      type: Sequelize.DATE,
      defaultValue: new Date()
    }
  },
  { freezeTableName: true }
);

const Line = sequelize.define(
  "lines",
  {
    userid: {
      type: Sequelize.STRING,
      primaryKey: true
    },
    lines_created: {
      type: Sequelize.JSONB
    }
  },
  { freezeTableName: true }
);

const Photo = sequelize.define(
  "photos",
  {
    userid: {
      type: Sequelize.STRING,
      primaryKey: true
    },
    photos_created: {
      type: Sequelize.JSONB
    }
  },
  { freezeTableName: true }
);

// These are actually restrictions
function addToLines(newValue, userid, res) {
  Line.findOne({
    where: {
      userid: userid
    }
  })
    .then(foundLinesForUser => {
      if (foundLinesForUser !== null) {
        // update the user's lines found
        foundLinesForUser.lines_created.push(newValue);
        return Line.update(
          {
            lines_created: foundLinesForUser.lines_created
          },
          {
            where: {
              userid: userid
            }
          }
        );
      } else {
        return Line.create({ userid: userid, lines_created: [newValue] });
      }
    })
    .then(updatedUser => {})
    .catch(error => {
      console.log(error);
    });
}

function addToPhotos(newValue, userid, res) {
  Photo.findOne({
    where: {
      userid: userid
    }
  })
    .then(foundPhotos => {
      if (foundPhotos !== null) {
        // update the user's lines found
        foundPhotos.photos_created.push(newValue);
        return Photo.update(
          {
            photos_created: foundPhotos.lines_created
          },
          {
            where: {
              userid: userid
            }
          }
        );
      } else {
        return Photo.create({ userid: userid, photos_created: [newValue] });
      }
    })
    .then(updatedUser => {})
    .catch(error => {
      console.log(error);
    });
}

module.exports = {
  User: User,
  Line: Line,
  Photo: Photo,
  addToLines: addToLines,
  addToPhotos: addToPhotos
};
