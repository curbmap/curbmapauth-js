const Sequelize = require('sequelize');
require('dotenv').config({path: '../curbmap.env'});
const sequelize = new Sequelize('postgres://'+
    process.env.USERDB_USERNAME + ':' +
    process.env.USERDB_PASSWORD + '@' + process.env.POSTGRES_HOST +'/' + process.env.POSTGRES_DB);

const User = sequelize.define('standard_user', {
    id_user: { type: Sequelize.STRING, primaryKey: true},
    active_account: { type: Sequelize.INTEGER, defaultValue: 1 },
    auth_token: { type: Sequelize.STRING },
    authorized: { type: Sequelize.INTEGER, defaultValue: 0 },
    date_created: { type: Sequelize.DATE, defaultValue: new Date() },
    external_auth_key: { type: Sequelize.STRING },
    external_auth_service: { type: Sequelize.STRING },
    password_hash: { type: Sequelize.STRING },
    role: {type: Sequelize.STRING, defaultValue: "ROLE_USER" },
    user_email: {type: Sequelize.STRING },
    username: { type: Sequelize.STRING },
    external_auth_id: { type: Sequelize.STRING },
    createdAt: { type: Sequelize.DATE, defaultValue: new Date()  },
    updatedAt: { type: Sequelize.DATE, defaultValue: new Date()  },
    score: { type: Sequelize.INTEGER, defaultValue: 0 },
    score_updatedAt: { type: Sequelize.DATE, defaultValue: new Date()  },
    badge: { type: Sequelize.STRING, defaultValue: 'beginner'},
    badge_updatedAt: { type: Sequelize.DATE, defaultValue: new Date() }
}, {freezeTableName: true});

const Point = sequelize.define('point', {
    user_id: { type: Sequelize.STRING, primaryKey: true },
    points_created: { type: Sequelize.JSONB }
});

function addToPoints(newValue, userid, res) {
    sequelize.query('UPDATE points set points_created=( CAST((SELECT points_created FROM points WHERE user_id=:userid) AS JSONB) || CAST(:pushedvalue AS JSONB)) WHERE user_id=:userid',
        {replacements: {userid: userid, pushedvalue: JSON.stringify(newValue)}, type: sequelize.QueryTypes.UPDATE, raw: true}
    ).then(function (results) {
        res.json({"success": true});
    }).catch(function (error) {
        res.json({"success": false});
        console.log("Error: "+ error);
    });
}

module.exports = { User: User, Point: Point, addToPoints: addToPoints };
