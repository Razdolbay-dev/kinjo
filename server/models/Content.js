const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Content = sequelize.define('Content', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: false
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    original_title: {
        type: DataTypes.STRING(255)
    },
    description: {
        type: DataTypes.TEXT
    },
    poster_url: {
        type: DataTypes.STRING(500)
    },
    year: {
        type: DataTypes.INTEGER
    },
    kinopoisk_id: {
        type: DataTypes.INTEGER
    },
    imdb_id: {
        type: DataTypes.STRING(50)
    },
    audio_tracks: {
        type: DataTypes.TEXT
    },
    video_quality: {
        type: DataTypes.STRING(50)
    },
    seasons_count: {
        type: DataTypes.INTEGER
    },
    episodes_count: {
        type: DataTypes.INTEGER
    },
    created_at: {
        type: DataTypes.DATE
    },
    updated_at: {
        type: DataTypes.DATE
    },
    is_lgbt: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    player_url: {
        type: DataTypes.STRING(500)
    },
    content_type_id: {
        type: DataTypes.INTEGER
    },
    age_restriction: {
        type: DataTypes.STRING(20)
    },
    cast: {
        type: DataTypes.TEXT
    },
    directors: {
        type: DataTypes.TEXT
    },
    screenwriters: {
        type: DataTypes.TEXT
    },
    producers: {
        type: DataTypes.TEXT
    },
    operators: {
        type: DataTypes.TEXT
    },
    composers: {
        type: DataTypes.TEXT
    },
    artists: {
        type: DataTypes.TEXT
    },
    editors: {
        type: DataTypes.TEXT
    },
    duration: {
        type: DataTypes.INTEGER
    },
    end_year: {
        type: DataTypes.INTEGER
    },
    premiere_at: {
        type: DataTypes.DATE
    },
    last_season_premiere_at: {
        type: DataTypes.DATE
    },
    exclusive_start_at: {
        type: DataTypes.DATE
    },
    exclusive_end_at: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'contents',
    timestamps: false
});

// Ассоциации (если нужно будет расширить)
Content.associate = (models) => {
    Content.belongsToMany(models.Genre, {
        through: 'content_genres',
        foreignKey: 'content_id',
        otherKey: 'genre_id'
    });

    Content.belongsToMany(models.Country, {
        through: 'content_countries',
        foreignKey: 'content_id',
        otherKey: 'country_id'
    });

    Content.hasMany(models.Rating, {
        foreignKey: 'content_id',
        as: 'ratings'
    });
};

module.exports = Content;